import type { BookContent } from "./book-renderer.js";

// Builds the brand book from a 3.0.0 schema without a model (roadmap C5, D8).
// Every line in the book is something the schema already says. Example copy
// comes only from examples the brand itself judged: Ramoira does not write
// content (RMT1), so nothing a model drafted appears unless the brand judged it.

type Obj = Record<string, unknown>;

export const BRAND_JUDGES = new Set(["brand_owner", "brand_team"]);

const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strs = (v: unknown): string[] => arr(v).map(str).filter(Boolean);

export interface JudgedExample {
  example_id: string;
  surface: string;
  text: string;
  verdict: "approved" | "rejected";
  reason: string;
  judged_by: string;
}

export function brandJudgedExamples(schema: Obj): JudgedExample[] {
  return arr(obj(schema.voice).examples)
    .map(obj)
    .filter((e) => BRAND_JUDGES.has(str(e.judged_by)))
    .map((e) => ({
      example_id: str(e.example_id),
      surface: str(e.surface),
      text: str(e.text),
      verdict: e.verdict === "approved" ? ("approved" as const) : ("rejected" as const),
      reason: str(e.reason),
      judged_by: str(e.judged_by),
    }));
}

export function buildBookContent(schema: Obj, today = new Date()): BookContent {
  const meta = obj(schema.ramoira);
  const ratification = obj(meta.ratification);
  const ratified = Object.keys(ratification).length > 0;
  const provenance = obj(schema.draft_provenance);

  const prism = obj(obj(schema.identity).prism);
  const narrative = obj(schema.narrative);
  const semiotic = obj(narrative.semiotic);
  const myth = obj(narrative.myth);
  const voice = obj(schema.voice);
  const rules = arr(schema.rules).map(obj);

  const ruleStatements = (pred: (r: Obj) => boolean) => rules.filter(pred).map((r) => str(r.statement)).filter(Boolean);
  const topic = (r: Obj) => str(r.topic);

  const examples = brandJudgedExamples(schema);
  const variants = arr(voice.contextVariants).map(obj);
  const instructionFor = (surface: string) =>
    str(variants.find((v) => v.surface === surface)?.openingInstruction);

  return {
    brandName: str(obj(provenance.intake).name) || str(meta.brand_id) || "Brand",
    oneLiner: str(obj(semiotic.denotative).categoryDescriptor),
    effectiveDate: str(ratification.ratified_at).slice(0, 10) || today.toISOString().slice(0, 10),
    statusLabel: ratified ? "Ratified" : "Candidate — not ratified",

    mythNarrative: [str(myth.culturalTension), str(myth.mythStatement)].filter(Boolean).join(" "),
    mythTest: str(obj(arr(narrative.guidance)[0]).question),

    customerPortrait: [str(obj(prism.reflection).depictedCustomer), str(obj(prism.reflection).ageSignal)]
      .filter(Boolean)
      .join(" "),
    threeAdjectives: [],
    neverDo: ruleStatements((r) => topic(r).startsWith("identity.")),

    voiceCharacter: str(obj(prism.personality).characterBrief),
    approvedTones: strs(voice.approvedTones),
    forbiddenTones: ruleStatements((r) => topic(r).startsWith("voice")),
    examples: examples.map((e) => ({ surface: e.surface, text: e.text, verdict: e.verdict, reason: e.reason })),

    pillars: arr(narrative.pillars)
      .map(obj)
      .map((p) => ({ name: str(p.name), claim: str(p.coreClaim), description: str(p.description) }))
      .filter((p) => p.name),

    absoluteConstraints: ruleStatements((r) => r.severity === "absolute"),
    strongConstraints: ruleStatements((r) => r.severity === "strong"),
    preflight: arr(narrative.guidance).map((g) => str(obj(g).question)).filter(Boolean),

    scenarios: examples
      .filter((e) => e.verdict === "approved")
      .map((e) => ({ surface: e.surface, instruction: instructionFor(e.surface), copy: e.text, note: e.reason })),
  };
}

export function anchorArchetypeId(schema: Obj): string | undefined {
  return str(obj(arr(obj(schema.draft_provenance).anchors)[0]).archetype_id) || undefined;
}
