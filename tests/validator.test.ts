import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { validateSchema } from "../src/lib/validator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8"));

describe("validateSchema", () => {
  it("accepts a fully valid schema", () => {
    const result = validateSchema(fixture("valid.schema.json"));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an invalid schema and reports errors", () => {
    const result = validateSchema(fixture("invalid.schema.json"));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports missing meta fields", () => {
    const result = validateSchema(fixture("invalid.schema.json"));
    const joined = result.errors.join(" ");
    expect(joined).toMatch(/brandName/);
    expect(joined).toMatch(/schemaVersion/);
  });

  it("reports threeAdjectives minItems violation", () => {
    const result = validateSchema(fixture("invalid.schema.json"));
    expect(result.errors.some((e) => e.includes("threeAdjectives"))).toBe(true);
  });

  it("reports missing narrative semiotic and myth", () => {
    const result = validateSchema(fixture("invalid.schema.json"));
    const joined = result.errors.join(" ");
    expect(joined).toMatch(/semiotic/);
    expect(joined).toMatch(/myth/);
  });

  it("rejects non-object input", () => {
    const result = validateSchema("not a schema");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects null input", () => {
    const result = validateSchema(null);
    expect(result.valid).toBe(false);
  });

  it("rejects an empty object as an unrecognisable document", () => {
    const result = validateSchema({});
    expect(result.valid).toBe(false);
    expect(result.specVersion).toBeNull();
    expect(result.errors.join(" ")).toMatch(/cannot tell what this document is/);
  });

  it("names every missing layer of a 3.0.0 schema", () => {
    const doc = JSON.parse(readFileSync(resolve(__dirname, "fixtures", "corvane.schema.json"), "utf8"));
    for (const key of ["identity", "narrative", "voice", "commercial", "governance"]) delete doc[key];
    const joined = validateSchema(doc).errors.join(" ");
    for (const key of ["identity", "narrative", "voice", "commercial", "governance"]) expect(joined).toMatch(key);
  });

  it("labels a 2.0.0 schema as superseded spec", () => {
    expect(validateSchema(fixture("valid.schema.json")).specVersion).toBe("2.0.0");
  });
});

describe("validateSchema (3.0.0)", () => {
  it("accepts the Corvane example as a full schema", () => {
    const result = validateSchema(fixture("corvane.schema.json"));
    expect(result).toMatchObject({ valid: true, specVersion: "3.0.0", kind: "full" });
  });

  it("reports the document's own spec_version (3.1.0)", () => {
    const doc = fixture("corvane.schema.json");
    doc.ramoira.spec_version = "3.1.0";
    for (const rating of doc.draft_provenance?.closeness_ratings ?? []) rating.answered_by = "p_owner";
    expect(validateSchema(doc)).toMatchObject({ valid: true, specVersion: "3.1.0", kind: "full" });
  });

  it("refuses a 3.1.0 field in a document that declares 3.0.0", () => {
    const doc = fixture("corvane.schema.json");
    doc.draft_provenance.retests = [];
    const result = validateSchema(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/added in spec 3\.1\.0/);
  });

  it("rejects certified and confidence", () => {
    for (const field of ["certified", "confidence"]) {
      const doc = fixture("corvane.schema.json");
      doc.ramoira[field] = field === "certified" ? true : 0.97;
      expect(validateSchema(doc).valid).toBe(false);
    }
  });

  it("reports the invariant behind an error", () => {
    const doc = fixture("corvane.schema.json");
    doc.narrative.myth.mythStatement = "Changed without rehashing.";
    const result = validateSchema(doc);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.invariant === 8)).toBe(true);
  });

  it("does not accept an unknown document", () => {
    expect(validateSchema({ hello: "world" }).valid).toBe(false);
  });
});
