import Anthropic from "@anthropic-ai/sdk";
import type { IntakeAnswers } from "./intake.js";
import { TOOL_DEFINITIONS, executeTool } from "./generator-tools.js";
import { validateSchema } from "./validator.js";

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

## Constrained<string> fields — critical shape requirement

The following fields must be arrays of objects with shape { value: string, severity: "absolute"|"strong"|"contextual", rationale: string }.
NEVER output plain strings for these fields:
- identity.distinctiveAssets.linguistic.ownedPhrases
- identity.distinctiveAssets.linguistic.forbiddenWords
- commercial.pricing.forbiddenLanguage
- commercial.globalForbiddenTerms
- commercial.offers.forbiddenTypes

## Other required nested field shapes

- governance.conflictResolution.knownConflicts[]: must include { scenario, winner, rationale }
- commercial.pricing.surfaceOverrides[]: must include { surface, style }

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

// ── Known-value injection ─────────────────────────────────────────────────────

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

// ── Structural repair ─────────────────────────────────────────────────────────
// Fixes predictable shape errors the model makes on Constrained<string> fields
// and other nested objects with required properties.

type DeepObj = Record<string, unknown>;

function getPath(root: DeepObj, path: string[]): unknown {
  let node: unknown = root;
  for (const key of path) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as DeepObj)[key];
  }
  return node;
}

function setPath(root: DeepObj, path: string[], value: unknown): void {
  let node: DeepObj = root;
  for (const key of path.slice(0, -1)) {
    if (typeof node[key] !== "object" || node[key] === null) return;
    node = node[key] as DeepObj;
  }
  node[path[path.length - 1]] = value;
}

function repairConstrainedArray(root: DeepObj, path: string[]): void {
  const arr = getPath(root, path);
  if (!Array.isArray(arr)) return;
  setPath(
    root,
    path,
    arr.map((item) => {
      if (typeof item === "string") {
        return { value: item, severity: "contextual", rationale: "" };
      }
      if (item !== null && typeof item === "object") {
        const o = item as DeepObj;
        if (!("severity" in o)) o.severity = "contextual";
        if (!("rationale" in o)) o.rationale = "";
        if (!("value" in o) && "constraint" in o) o.value = o.constraint;
      }
      return item;
    }),
  );
}

function repairSurfaceOverrides(root: DeepObj): void {
  const arr = getPath(root, ["commercial", "pricing", "surfaceOverrides"]);
  if (!Array.isArray(arr)) return;
  const baseStyle =
    (getPath(root, ["commercial", "pricing", "style"]) as string) ?? "simple";
  setPath(
    root,
    ["commercial", "pricing", "surfaceOverrides"],
    arr.map((item) => {
      if (item !== null && typeof item === "object") {
        const o = item as DeepObj;
        if (!("style" in o)) o.style = baseStyle;
      }
      return item;
    }),
  );
}

function repairKnownConflicts(root: DeepObj): void {
  const arr = getPath(root, [
    "governance",
    "conflictResolution",
    "knownConflicts",
  ]);
  if (!Array.isArray(arr)) return;
  setPath(
    root,
    ["governance", "conflictResolution", "knownConflicts"],
    arr.map((item) => {
      if (item !== null && typeof item === "object") {
        const o = item as DeepObj;
        if (!("scenario" in o)) {
          o.scenario =
            typeof o.description === "string"
              ? o.description
              : typeof o.conflict === "string"
                ? o.conflict
                : "conflict between components";
        }
        if (!("winner" in o)) o.winner = "governance";
        if (!("rationale" in o)) o.rationale = "";
      }
      return item;
    }),
  );
}

export function repairSchema(schema: Record<string, unknown>): Record<string, unknown> {
  repairConstrainedArray(schema, ["identity", "distinctiveAssets", "linguistic", "ownedPhrases"]);
  repairConstrainedArray(schema, ["identity", "distinctiveAssets", "linguistic", "forbiddenWords"]);
  repairConstrainedArray(schema, ["commercial", "pricing", "forbiddenLanguage"]);
  repairConstrainedArray(schema, ["commercial", "globalForbiddenTerms"]);
  repairConstrainedArray(schema, ["commercial", "offers", "forbiddenTypes"]);
  repairSurfaceOverrides(schema);
  repairKnownConflicts(schema);
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

async function runGenerationLoop(
  client: Anthropic,
  messages: Anthropic.Messages.MessageParam[],
): Promise<string> {
  const MAX_ITERATIONS = 12;
  let finalText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 20000,
      thinking: { type: "enabled", budget_tokens: 10000 },
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages,
    });

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
          const result = executeTool(block.name, block.input as Record<string, string>);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    finalText = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    break;
  }

  if (!finalText) {
    throw new Error("Model did not produce a final schema. Try running init again.");
  }

  return finalText;
}

// ── Repair + retry pass ───────────────────────────────────────────────────────

async function repairWithRetry(
  client: Anthropic,
  schema: Record<string, unknown>,
  errors: string[],
): Promise<Record<string, unknown>> {
  const errorList = errors.slice(0, 15).map((e) => `  - ${e}`).join("\n");

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: `The schema you generated has validation errors. Fix only the fields listed below and return the complete corrected JSON object. Do not change any other fields.

Errors:
${errorList}

Current schema:
${JSON.stringify(schema, null, 2)}

Return ONLY the corrected JSON object. No explanation. No markdown.`,
    },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 20000,
    thinking: { type: "enabled", budget_tokens: 5000 },
    system: SYSTEM_PROMPT,
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return extractJson(text);
}

// ── Public entry ──────────────────────────────────────────────────────────────

export async function generateSchema(
  intake: IntakeAnswers,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const client = new Anthropic({ apiKey });

  // 1. Generate
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: buildUserMessage(intake) },
  ];
  const finalText = await runGenerationLoop(client, messages);
  let schema = extractJson(finalText);
  schema = injectKnownValues(schema, intake);

  // 2. Structural repair (fixes predictable Constrained<string> and shape errors)
  schema = repairSchema(schema);

  // 3. Validate — if still broken, one retry with errors fed back to Claude
  const firstCheck = validateSchema(schema);
  if (!firstCheck.valid) {
    schema = await repairWithRetry(client, schema, firstCheck.errors);
    schema = injectKnownValues(schema, intake); // re-inject in case retry overwrote meta
    schema = repairSchema(schema);             // re-repair in case retry introduced new shape issues
  }

  return schema;
}

export function resolveApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}
