import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { buildBookContent, brandJudgedExamples } from "../src/lib/book-content.js";
import { applyJudgments, type Judgment } from "../src/lib/probes.js";
import { validateSchema } from "../src/lib/validator.js";
import { renderBrandBook } from "../src/lib/book-renderer.js";
import { getTheme } from "../src/lib/book-archetypes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const corvane = () => JSON.parse(readFileSync(resolve(__dirname, "fixtures", "corvane.schema.json"), "utf8"));

const probe = (n: number, surface = "social_organic") => ({
  probe_id: `probe_test_${n}`,
  surface,
  text: `Probe line ${n}.`,
});

describe("buildBookContent", () => {
  it("labels an unratified schema as a candidate", () => {
    expect(buildBookContent(corvane()).statusLabel).toBe("Candidate — not ratified");
  });

  it("shows only brand-judged examples", () => {
    const doc = corvane();
    doc.voice.examples[0].judged_by = "agency";
    const content = buildBookContent(doc);
    expect(content.examples.map((e) => e.text)).not.toContain(doc.voice.examples[0].text);
    expect(content.examples).toHaveLength(brandJudgedExamples(doc).length);
  });

  it("takes every line from the schema", () => {
    const doc = corvane();
    const content = buildBookContent(doc);
    expect(content.mythNarrative).toContain(doc.narrative.myth.mythStatement);
    expect(content.absoluteConstraints).toContain("Never describe the pans with fear vocabulary about other cookware.");
    for (const s of content.scenarios) {
      expect(doc.voice.examples.map((e: { text: string }) => e.text)).toContain(s.copy);
    }
  });

  it("renders HTML with the candidate label", () => {
    const html = renderBrandBook(buildBookContent(corvane()), getTheme("peer"));
    expect(html).toContain("Candidate — not ratified");
  });
});

describe("applyJudgments", () => {
  const judgments: Judgment[] = [
    { probe: probe(1), reaction: "yes", reason: "Sounds like us." },
    { probe: probe(2), reaction: "no", reason: "Too breathless." },
    { probe: probe(3), reaction: "close", reason: "Right idea, wrong register." },
  ];

  it("turns yes and no into brand-judged examples and keeps every reaction", () => {
    const { schema, exampleIds } = applyJudgments(corvane(), judgments, "brand_owner");
    expect(exampleIds).toHaveLength(2);
    const added = schema.voice.examples.filter((e: { example_id: string }) => exampleIds.includes(e.example_id));
    expect(added.map((e: { verdict: string }) => e.verdict)).toEqual(["approved", "rejected"]);
    expect(added.every((e: { judged_by: string; source: string }) => e.judged_by === "brand_owner" && e.source === "owner_reaction")).toBe(true);
    expect(schema.draft_provenance.reactions.slice(-3).map((r: { reaction: string }) => r.reaction)).toEqual(["yes", "no", "close"]);
  });

  it("produces a valid schema with a recomputed hash", () => {
    const before = corvane();
    const { schema } = applyJudgments(before, judgments, "brand_owner");
    expect(validateSchema(schema).valid).toBe(true);
    expect(schema.ramoira.content_hash).not.toBe(before.ramoira.content_hash);
  });

  it("records an agency's judgments under the agency's role, kept out of the book", () => {
    const { schema, exampleIds } = applyJudgments(corvane(), judgments, "agency");
    expect(validateSchema(schema).valid).toBe(true);
    const texts = buildBookContent(schema).examples.map((e) => e.text);
    for (const id of exampleIds) {
      const ex = schema.voice.examples.find((e: { example_id: string }) => e.example_id === id);
      expect(texts).not.toContain(ex.text);
    }
  });

  it("does not modify the input, and refuses a ratified schema", () => {
    const doc = corvane();
    const snapshot = JSON.stringify(doc);
    applyJudgments(doc, judgments, "brand_owner");
    expect(JSON.stringify(doc)).toBe(snapshot);
    doc.ramoira.ratification = { ratification_id: "r", ratified_hash: doc.ramoira.content_hash, ratified_at: "2026-10-07T00:00:00Z", ratifier_role: "founder" };
    expect(() => applyJudgments(doc, judgments, "brand_owner")).toThrow(/ratified/);
  });

  it("creates draft provenance for a hand-written schema", () => {
    const doc = corvane();
    delete doc.draft_provenance;
    const { schema } = applyJudgments(doc, judgments, "brand_team");
    expect(schema.draft_provenance.method).toBe("manual");
    expect(validateSchema(schema).valid).toBe(true);
  });
});
