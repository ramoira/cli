import Anthropic from "@anthropic-ai/sdk";
import { computeContentHash } from "./validator.js";

// Probe sessions (roadmap C5, D8). A model drafts short sample lines for the
// brand to judge. Probes are not content: they are shown only to the person
// judging, never exported, and kept only as the evidence behind a judgment
// (draft_provenance.reactions). A line the brand marks "that's us" or "not us"
// becomes a brand-judged example; only those can appear in the brand book.

export const PROBE_MODEL = "claude-opus-5-5";

export type Reaction = "yes" | "close" | "no";
export type JudgeRole = "brand_owner" | "brand_team" | "agency" | "freelancer";

export interface Probe {
  probe_id: string;
  surface: string;
  text: string;
}

export interface Judgment {
  probe: Probe;
  reaction: Reaction;
  reason: string | null;
}

type Obj = Record<string, any>;

const PROBE_SYSTEM = `You help a brand owner find out what their brand sounds like, by drafting short sample lines for them to judge.

These lines are probes, not content. Only the brand's own team sees them. They mark each one "that's us", "close" or "not us" and say why. Nothing you write is published or used as copy.

Write lines a real producer might plausibly write on the given surface, using the brand schema you are given. Vary them: most should follow the schema, and some should sit near the edges of its rules (tone, claims, framing) so the owner's verdict teaches something. Keep each line under 40 words. Never put a line's intent or a label inside the line itself.`;

const PROBE_SCHEMA = {
  type: "object",
  properties: {
    probes: {
      type: "array",
      items: {
        type: "object",
        properties: { surface: { type: "string" }, text: { type: "string" } },
        required: ["surface", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["probes"],
  additionalProperties: false,
} as const;

/** The parts of the schema a producer would write from. */
function probeContext(schema: Obj): Obj {
  const { rules, identity, narrative, voice } = schema;
  return { rules, identity, narrative, voice };
}

export async function draftProbes(
  schema: Obj,
  surfaces: string[],
  apiKey: string,
  perSurface = 2,
): Promise<Probe[]> {
  const client = new Anthropic({ apiKey });
  const response = await client.beta.messages.create({
    model: PROBE_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: PROBE_SCHEMA } },
    system: PROBE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Brand schema:\n${JSON.stringify(probeContext(schema), null, 2)}\n\nDraft ${perSurface} probe lines for each of these surfaces: ${surfaces.join(", ")}.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to draft probes for this schema.");
  }
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = JSON.parse(text) as { probes: Array<{ surface: string; text: string }> };

  const stamp = Date.now().toString(36);
  return parsed.probes
    .filter((p) => p.text.trim() && surfaces.includes(p.surface))
    .map((p, i) => ({ probe_id: `probe_book_${stamp}_${i + 1}`, surface: p.surface, text: p.text.trim() }));
}

export interface RuleProbe extends Probe {
  rule_id: string;
}

const RULE_PROBE_SCHEMA = {
  type: "object",
  properties: {
    probes: {
      type: "array",
      items: {
        type: "object",
        properties: { rule_id: { type: "string" }, surface: { type: "string" }, text: { type: "string" } },
        required: ["rule_id", "surface", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["probes"],
  additionalProperties: false,
} as const;

/**
 * Probes for candidate judged rules: for each rule, one line that keeps to it
 * and one that breaks it, in an order that does not say which is which. The
 * brand's verdicts on them are what let a judged rule exist at all.
 */
export async function draftRuleProbes(
  schema: Obj,
  rules: Array<{ rule_id: string; statement: string; surfaces: "all" | string[] }>,
  fallbackSurfaces: string[],
  apiKey: string,
): Promise<RuleProbe[]> {
  if (rules.length === 0) return [];
  const client = new Anthropic({ apiKey });
  const list = rules
    .map((r) => `- ${r.rule_id}: "${r.statement}" (surfaces: ${r.surfaces === "all" ? fallbackSurfaces.join(", ") : r.surfaces.join(", ")})`)
    .join("\n");
  const response = await client.beta.messages.create({
    model: PROBE_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: RULE_PROBE_SCHEMA } },
    system: PROBE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Brand schema:\n${JSON.stringify(probeContext(schema), null, 2)}\n\nCandidate rules:\n${list}\n\nFor each rule, draft exactly two lines on one of its surfaces: one that keeps to the rule and one that clearly breaks it. Vary which comes first. Return the rule_id with each line.`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined to draft probes for this schema.");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = JSON.parse(text) as { probes: Array<{ rule_id: string; surface: string; text: string }> };

  const known = new Set(rules.map((r) => r.rule_id));
  const stamp = Date.now().toString(36);
  return parsed.probes
    .filter((p) => known.has(p.rule_id) && p.text.trim())
    .map((p, i) => ({
      probe_id: `probe_init_${stamp}_${i + 1}`,
      rule_id: p.rule_id,
      surface: fallbackSurfaces.includes(p.surface) ? p.surface : fallbackSurfaces[0],
      text: p.text.trim(),
    }));
}

/**
 * Records judgments in a 3.0.0 schema: every reaction goes into
 * draft_provenance.reactions; "yes" and "no" become examples judged by the
 * person's role. "close" changes no example. Returns a new schema with its
 * content_hash recomputed; the input is not modified.
 */
export function applyJudgments(
  schema: Obj,
  judgments: Judgment[],
  role: JudgeRole,
  today = new Date(),
): { schema: Obj; exampleIds: string[]; byJudgment: Array<string | null> } {
  if (schema?.ramoira?.ratification) {
    throw new Error("This schema is ratified. Adding examples would change it; edit a copy and ratify again.");
  }
  const next: Obj = structuredClone(schema);
  const date = today.toISOString().slice(0, 10);

  const provenance: Obj = (next.draft_provenance ??= { method: "manual" });
  const participants: Obj[] = (provenance.participants ??= []);
  let participant = participants.find((p) => p.role === role);
  if (!participant) {
    let id = `p_${role}`;
    for (let n = 2; participants.some((p) => p.participant_id === id); n++) id = `p_${role}_${n}`;
    participant = { participant_id: id, role };
    participants.push(participant);
  }

  const examples: Obj[] = (next.voice.examples ??= []);
  const reactions: Obj[] = (provenance.reactions ??= []);
  const taken = new Set(examples.map((e) => e.example_id));
  const exampleIds: string[] = [];
  const byJudgment: Array<string | null> = [];

  for (const { probe, reaction, reason } of judgments) {
    const resulted: string[] = [];
    if (reaction !== "close") {
      let id = `ex_${probe.surface}_1`;
      for (let n = 2; taken.has(id); n++) id = `ex_${probe.surface}_${n}`;
      taken.add(id);
      examples.push({
        example_id: id,
        surface: probe.surface,
        text: probe.text,
        verdict: reaction === "yes" ? "approved" : "rejected",
        reason: reason?.trim() || (reaction === "yes" ? "Marked \"that's us\"." : "Marked \"not us\"."),
        judged_by: role,
        source: "owner_reaction",
        captured_at: date,
      });
      resulted.push(id);
      exampleIds.push(id);
    }
    byJudgment.push(resulted[0] ?? null);
    reactions.push({
      probe_id: probe.probe_id,
      surface: probe.surface,
      text: probe.text,
      reaction,
      reason: reason?.trim() || null,
      answered_by: participant.participant_id,
      captured_at: date,
      resulted_in: { fields: [], example_ids: resulted },
    });
  }

  next.ramoira.content_hash = computeContentHash(next);
  return { schema: next, exampleIds, byJudgment };
}
