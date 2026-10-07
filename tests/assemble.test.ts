import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { assembleCandidate, resolveJudgedRules } from "../src/lib/assemble.js";
import { applyJudgments } from "../src/lib/probes.js";
import { validateSchema } from "../src/lib/validator.js";
import { generateAgentsMd } from "../src/lib/agents-md.js";
import { parseList } from "../src/lib/intake.js";
import type { IntakeAnswers } from "../src/lib/intake.js";
import type { Draft } from "../src/lib/draft.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const draft = (): Draft => JSON.parse(readFileSync(resolve(__dirname, "fixtures", "draft.json"), "utf8"));

const intake = (over: Partial<IntakeAnswers> = {}): IntakeAnswers => ({
  answeredBy: "brand_owner",
  brandName: "Corvane",
  brandId: "corvane",
  categoryDescriptor: "Carbon-steel frying pans for home cooks.",
  mythStatement: "A pan is not finished when you buy it. You finish it by cooking.",
  founded: "2014",
  approvedTones: ["plain-spoken", "practical"],
  avoidTones: ["hype"],
  neverDo: ["never promise effortlessness"],
  forbiddenWords: ["non-toxic", "chemical-free"],
  claims: ["Spun from 2 mm carbon steel.", "25-year warranty against warping."],
  competitors: ["Ironhold"],
  surfaces: ["social_organic", "product_detail_page", "press_release"],
  pricingStyle: "transparent",
  ...over,
});

const settle = (i = intake()) => {
  const { schema, pending } = assembleCandidate(i, draft(), "0.0.0-test");
  return { pending, ...resolveJudgedRules(schema, pending, {}) };
};
const rule = (s: any, id: string) => s.rules.find((r: any) => r.rule_id === id);

describe("assembleCandidate (init, offline questionnaire)", () => {
  it("produces a valid 3.0.0 full schema", () => {
    const { schema } = settle();
    const result = validateSchema(schema);
    expect(result.errors).toEqual([]);
    expect(result).toMatchObject({ valid: true, specVersion: "3.0.0", kind: "full" });
  });

  it("P2 exit test: all five layers, including pillars, mythEvolution, contextVariants and rails", () => {
    const { schema } = settle();
    for (const layer of ["identity", "narrative", "voice", "commercial", "governance"]) expect(schema[layer]).toBeTruthy();
    expect(schema.narrative.pillars.length).toBeGreaterThan(0);
    expect(schema.narrative.mythEvolution.modernTensions.length).toBeGreaterThan(0);
    expect(schema.voice.contextVariants.length).toBeGreaterThan(0);
    expect(schema.voice.rails.global.length).toBeGreaterThan(0);
  });

  it("P2 exit test: a candidate, unratified, with no account", () => {
    const { schema } = settle();
    expect(schema.ramoira).toMatchObject({ workflow_state: "draft", ratification: null, account_owner_verified: false, canonical_url: null });
  });

  it("writes no model copy: no examples until the brand judges probes", () => {
    expect(settle().schema.voice.examples).toEqual([]);
  });

  it("records what the owner typed as authored, affirmed rules", () => {
    const { schema } = settle();
    expect(rule(schema, "r_forbidden_words")).toMatchObject({ provenance: "authored", affirmed: true, match: { terms: ["non-toxic", "chemical-free"] } });
    expect(rule(schema, "r_competitor_names")).toMatchObject({ visibility: "private", provenance: "authored" });
    expect(schema.narrative.semiotic.denotative.claims.map((c: any) => c.claim)).toEqual(intake().claims);
    expect(schema.narrative.myth.mythStatement).toBe(intake().mythStatement);
  });

  it("marks every model-proposed rule unaffirmed, so ratification is blocked until the brand affirms it", () => {
    const { schema } = settle();
    const proposed = schema.rules.filter((r: any) => !["r_forbidden_words", "r_competitor_names"].includes(r.rule_id));
    expect(proposed.length).toBeGreaterThan(0);
    expect(proposed.every((r: any) => r.provenance === "inherited" && r.affirmed === false)).toBe(true);
    const urgency = proposed.find((r: any) => r.topic === "commercial.pricing.urgency");
    expect(urgency).toMatchObject({ check_class: "deterministic_exact", visibility: "private" });
  });

  it("leaves brand facts unfilled instead of inventing them", () => {
    const { schema } = settle();
    const fields = schema.draft_provenance.fields;
    for (const p of ["/identity/prism/culture/originNarrative", "/identity/distinctiveAssets/linguistic/ownedPhrases", "/identity/distinctiveAssets/visual/primaryColor"]) {
      expect(fields[p]).toBe("unfilled");
    }
    expect(schema.identity.prism.culture.originNarrative).toBeUndefined();
    expect(schema.identity.distinctiveAssets.linguistic.ownedPhrases).toBeUndefined();
  });

  it("keeps only the surfaces the owner chose, and keeps scale deltas in range", () => {
    const { schema } = settle();
    expect(schema.voice.contextVariants.map((v: any) => v.surface)).toEqual(["social_organic", "product_detail_page"]);
    const social = schema.voice.contextVariants[0];
    expect(4 + social.formalityDelta).toBeGreaterThanOrEqual(0);
    expect(6 + social.warmthDelta).toBeLessThanOrEqual(10);
    expect(schema.narrative.pillars[0].surfaces).toEqual(["social_organic"]);
  });

  it("holds judged rules back, and turns unbacked ones into guidance questions", () => {
    const { schema, pending, toGuidance } = settle();
    expect(pending.length).toBe(3);
    expect(toGuidance).toEqual(pending.map((p) => p.rule_id));
    expect(schema.rules.some((r: any) => r.check_class === "judged_bounded")).toBe(false);
    expect(schema.narrative.guidance.map((g: any) => g.question)).toContain('Does this keep to: "Never present the pan as a gadget or a hack."?');
  });

  it("keeps a judged rule backed by one 'that's us' and one 'not us'", () => {
    const { schema, pending } = assembleCandidate(intake(), draft(), "0.0.0-test");
    const gadget = pending.find((p) => p.statement.includes("gadget"))!;
    const judgments = [
      { probe: { probe_id: "p1", surface: "product_detail_page", text: "Season it once, then cook.", rule_id: gadget.rule_id }, reaction: "yes" as const, reason: null },
      { probe: { probe_id: "p2", surface: "product_detail_page", text: "The kitchen hack you need.", rule_id: gadget.rule_id }, reaction: "no" as const, reason: "Gadget framing." },
    ];
    const { schema: withExamples, byJudgment } = applyJudgments(schema, judgments, "brand_owner");
    const { schema: settled, kept } = resolveJudgedRules(withExamples, pending, { [gadget.rule_id]: byJudgment.filter(Boolean) as string[] });
    expect(kept).toEqual([gadget.rule_id]);
    expect(rule(settled, gadget.rule_id)).toMatchObject({ check_class: "judged_bounded", provenance: "inherited", affirmed: false });
    expect(validateSchema(settled).errors).toEqual([]);
  });
});

describe("generateAgentsMd", () => {
  it("is built from the public summary: private rules stay out", () => {
    const md = generateAgentsMd(settle().schema);
    expect(md).toContain("Candidate — not ratified");
    expect(md).toContain("non-toxic");
    expect(md).not.toContain("Ironhold");
    expect(md).not.toContain("last chance");
  });
});

describe("parseList", () => {
  it("splits on semicolons when present, else commas", () => {
    expect(parseList("a, b ,c")).toEqual(["a", "b", "c"]);
    expect(parseList("Spun from 2 mm steel; 25-year warranty, against warping")).toEqual(["Spun from 2 mm steel", "25-year warranty, against warping"]);
    expect(parseList("  ")).toEqual([]);
  });
});
