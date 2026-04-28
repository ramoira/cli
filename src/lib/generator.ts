import Anthropic from "@anthropic-ai/sdk";
import type { IntakeAnswers } from "./intake.js";
import { TOOL_DEFINITIONS, executeTool } from "./generator-tools.js";

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are generating a Ramoira brand schema — a machine-readable brand operating system consumed by AI agents to produce on-brand content.

Every field in this schema is an instruction an AI will execute, not a description for a human to read. Write all values as specific, actionable directives. Vague or generic values make the schema useless.

Use the provided tools to look up layer specifications, valid enum values, and examples before writing each section. Do not guess at field shapes or enum values — look them up.

## Quality requirements

- voice.examples: at least 2 approved and 2 rejected, with real copy (not placeholders), and specific reasons
- narrative.contentTest: each test must be a specific yes/no question, not a generic instruction
- narrative.myth.culturalTension: name a real cultural conflict this brand takes a side on — not a category description
- governance.preflight: three binary yes/no checks specific to this brand, not generic brand hygiene
- governance.severity.absolute.constraints: at least one, derived directly from the never-do list
- All score fields (sincerity, excitement, competence, sophistication, ruggedness, formality, warmth, vocabularyLevel, aspirationalDelta): numbers 0–10

When you have gathered the information you need via tools, output the complete, filled JSON schema. Return ONLY the JSON object. No explanation. No markdown code blocks.`;

function buildUserMessage(intake: IntakeAnswers): string {
  return `Generate a complete Ramoira brand schema for the following brand:

- Brand name: ${intake.brandName}
- What they make or do: ${intake.categoryDescriptor}
- What they stand for (myth): ${intake.mythStatement}
- Three adjectives it should always feel like: ${intake.threeAdjectives.join(", ")}
- Relationship mode (archetype): ${intake.relationshipMode}
- Always on-brand tones: ${intake.approvedTones.join(", ")}
- Always off-brand tones: ${intake.forbiddenTones.join(", ")}
- Things the brand must never do: ${intake.neverDo.join("; ")}
- How the brand talks about money: ${intake.pricingStyle}

Use the tools to look up the layer specs, valid enum values, and examples. Then output the complete schema JSON.`;
}

// ── Known-value injection (values we already have from intake) ────────────────

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

// ── JSON extraction ───────────────────────────────────────────────────────────

export function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced
    ? fenced[1].trim()
    : (() => {
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start === -1 || end === -1)
          throw new Error("No JSON object found in model response.");
        return trimmed.slice(start, end + 1);
      })();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Model returned invalid JSON. Try running init again.");
  }
}

// ── Agentic generation loop ───────────────────────────────────────────────────

export async function generateSchema(
  intake: IntakeAnswers,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const client = new Anthropic({ apiKey });

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: buildUserMessage(intake) },
  ];

  let finalText = "";
  const MAX_ITERATIONS = 12;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 20000,
      thinking: { type: "enabled", budget_tokens: 10000 },
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    // Always preserve the full assistant turn (including thinking blocks)
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      finalText = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = executeTool(
            block.name,
            block.input as Record<string, string>,
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason — surface the text if any and stop
    finalText = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    break;
  }

  if (!finalText) {
    throw new Error(
      "Model did not produce a final schema after tool use. Try running init again.",
    );
  }

  const schema = extractJson(finalText);
  return injectKnownValues(schema, intake);
}

export function resolveApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}
