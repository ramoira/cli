import Anthropic from "@anthropic-ai/sdk";
import type { IntakeAnswers } from "./intake.js";
import template from "../schemas/brand.template.json";

function buildPrompt(intake: IntakeAnswers): string {
  const templateStr = JSON.stringify(template, null, 2);

  return `You are generating a Ramoira brand schema — a machine-readable brand operating system consumed by AI agents to produce on-brand content.

Every field in this schema is an instruction an AI will execute, not a description for a human to read. Write all values as specific, actionable directives. Vague or generic values make the schema useless.

## What each section does

**identity** — defines who the brand is: its character, visual and linguistic assets, and how it relates to people.
**narrative** — defines what the brand means: its cultural myth, semiotic layers, and content structure.
**voice** — defines how the brand speaks: tone, rhythm, examples of right and wrong copy, and per-surface rules.
**commercial** — defines how the brand behaves commercially: pricing language, claims, offers, and social proof rules.
**governance** — defines what an AI must never do, what requires human review, and preflight checks before any content is generated.

## Key field concepts

**Rails** — conditional instructions: \`{ "context": "when X", "instruction": "do Y", "example": "...", "antiExample": "..." }\`. An AI reads these and follows them situationally.
**governance.severity** — three tiers: \`absolute\` (AI blocks the output entirely), \`strong\` (AI flags for human review), \`contextual\` (AI uses judgment and logs).
**narrative.myth** — not marketing copy. The cultural tension this brand resolves, its protagonist role, and what it stands against. The \`mythTest\` is a yes/no question an AI asks to check if content fits the myth.
**narrative.contentTest** — three self-check questions the AI asks before approving any output: does this fit the myth? does it carry the right connotations? does it sound like us?
**governance.preflight** — three yes/no questions an AI runs before generating any content for this brand. Specific and binary.

## Valid enum values

Use only these values for the fields listed:

- \`voice.base.sentenceLength\`: "short" | "varied" | "long" | "fragments_permitted"
- \`voice.base.humourStyle\`: "dry" | "self_deprecating" | "absurdist" | "warm" | "irreverent" | "none"
- \`voice.examples[].verdict\`: "approved" | "rejected"
- \`voice.contextVariants[].surface\` and \`commercial.surfaceRules[].surface\`: "search_result_page" | "paid_landing_page" | "product_detail_page" | "comparison_page" | "editorial" | "brand_narrative" | "social_organic" | "social_paid" | "email_acquisition" | "email_retention" | "display_ad" | "video_script" | "audio_script" | "press_release" | "customer_service" | "packaging_copy" | "out_of_home"
- \`narrative.semiotic.layerHierarchy\`: "connotative_first" | "balanced" | "denotative_first"
- \`identity.prism.relationship.pronoun\`: "we" | "I" | "brand_name_only"
- \`identity.prism.relationship.powerDynamic\`: "brand_leads" | "equal" | "customer_leads"
- \`governance.severity.absolute.violationResponse\`: "block_output" | "flag_and_block"
- \`governance.severity.strong.violationResponse\`: "flag_for_review" | "block_output"
- \`governance.severity.contextual.violationResponse\`: "log_for_audit"
- All score fields (sincerity, excitement, competence, sophistication, ruggedness, formality, warmth, vocabularyLevel): numbers 0–10

## Brand context

- Brand name: ${intake.brandName}
- What this brand makes or does: ${intake.categoryDescriptor}
- What this brand stands for: ${intake.mythStatement}
- Three words it should always feel like: ${intake.threeAdjectives.join(", ")}
- How the brand relates to customers: ${intake.relationshipMode}
- Always on-brand tones: ${intake.approvedTones.join(", ")}
- Always off-brand tones: ${intake.forbiddenTones.join(", ")}
- Things the brand must never do: ${intake.neverDo.join("; ")}
- How the brand talks about money: ${intake.pricingStyle}

## Template

Ignore the \`meta\` block — it is set automatically. Fill every other field. Do not leave string fields empty or arrays empty where content is meaningful.

${templateStr}

## Quality checks

- voice.examples: write at least 2 approved and 2 rejected examples with real copy, not placeholders
- narrative.contentTest: each test must be a specific yes/no question, not a generic instruction
- governance.preflight: three binary checks specific to this brand, not generic brand hygiene
- governance.severity.absolute.constraints: at least one — derived directly from the never-do list
- narrative.myth: culturalTension should name a real cultural conflict this brand takes a side on

Return ONLY the complete JSON object. No explanation. No markdown code blocks.`;
}

function injectKnownValues(
  schema: Record<string, unknown>,
  intake: IntakeAnswers,
): Record<string, unknown> {
  const today = new Date().toISOString().split("T")[0];

  schema.meta = {
    ...((schema.meta as Record<string, unknown>) ?? {}),
    brandId: intake.brandId,
    brandName: intake.brandName,
    schemaVersion: "2.0.0",
    effectiveDate: today,
  };

  const identity = (schema.identity ?? {}) as Record<string, unknown>;
  const summary = (identity.summary ?? {}) as Record<string, unknown>;
  summary.threeAdjectives = intake.threeAdjectives;
  summary.neverDo = intake.neverDo;
  identity.summary = summary;

  const prism = (identity.prism ?? {}) as Record<string, unknown>;
  const relationship = (prism.relationship ?? {}) as Record<string, unknown>;
  relationship.mode = intake.relationshipMode;
  prism.relationship = relationship;
  identity.prism = prism;
  schema.identity = identity;

  const voice = (schema.voice ?? {}) as Record<string, unknown>;
  voice.approvedTones = intake.approvedTones;
  voice.forbiddenTones = intake.forbiddenTones;
  schema.voice = voice;

  const commercial = (schema.commercial ?? {}) as Record<string, unknown>;
  const pricing = (commercial.pricing ?? {}) as Record<string, unknown>;
  pricing.style = intake.pricingStyle;
  commercial.pricing = pricing;
  schema.commercial = commercial;

  return schema;
}

export function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : (() => {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object found in model response.");
    return trimmed.slice(start, end + 1);
  })();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Model returned invalid JSON. Try running init again.");
  }
}

export async function generateSchema(
  intake: IntakeAnswers,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(intake);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const schema = extractJson(text);
  return injectKnownValues(schema, intake);
}

export function resolveApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}
