import Anthropic from "@anthropic-ai/sdk";
import type { IntakeAnswers } from "./intake.js";
import template from "../schemas/brand.template.json";

function buildPrompt(intake: IntakeAnswers): string {
  const templateStr = JSON.stringify(template, null, 2);

  return `You are generating a Ramoira brand schema JSON document.

A Ramoira brand schema is a structured, machine-readable brand identity document with five components: identity, narrative, voice, commercial, and governance. Each component has "_component" and "_version": "2.0.0" fields.

## Brand intake answers

- Brand name: ${intake.brandName}
- Brand ID: ${intake.brandId}
- What this brand makes or does: ${intake.categoryDescriptor}
- What this brand stands for: ${intake.mythStatement}
- Three words it should always feel like: ${intake.threeAdjectives.join(", ")}
- How the brand relates to customers: ${intake.relationshipMode}
- Always on-brand tones: ${intake.approvedTones.join(", ")}
- Always off-brand tones: ${intake.forbiddenTones.join(", ")}
- Things the brand must never do: ${intake.neverDo.join("; ")}
- Pricing approach: ${intake.pricingStyle}

## Schema structure to fill

Use this blank template as the exact structure. Fill in ALL fields with meaningful, specific values. Do not leave string fields empty.

${templateStr}

## Requirements

- meta.brandId must be "${intake.brandId}"
- meta.brandName must be "${intake.brandName}"
- meta.schemaVersion must be "2.0.0"
- meta.effectiveDate must be "${new Date().toISOString().split("T")[0]}"
- identity.summary.threeAdjectives must be exactly: ${JSON.stringify(intake.threeAdjectives)}
- identity.summary.neverDo must include at least 5 items: ${JSON.stringify(intake.neverDo)}
- identity.prism.relationship.mode must be "${intake.relationshipMode}"
- voice.approvedTones must include: ${JSON.stringify(intake.approvedTones)}
- voice.forbiddenTones must include: ${JSON.stringify(intake.forbiddenTones)}
- commercial.pricing.style must be "${intake.pricingStyle}"
- voice.examples must have at least 2 approved and 2 rejected examples, each with context, text, verdict, and reason fields
- narrative.contentTest.mythTest, connotativeTest, and toneTest must each be a specific testable question
- governance.preflight.question1, question2, question3 must each be a specific brand governance question
- narrative.semiotic.denotative.categoryDescriptor must reflect: "${intake.categoryDescriptor}"
- narrative.myth.mythStatement must reflect: "${intake.mythStatement}"

Return ONLY the complete JSON object. No explanation. No markdown code blocks.`;
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

  return extractJson(text);
}

export function resolveApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}
