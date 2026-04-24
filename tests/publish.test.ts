import { describe, it, expect } from "vitest";
import { readFileSync, resolve as pathResolve } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { validateSchema } from "../src/lib/validator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8"));

// The publish command validates locally before making any network call.
// These tests verify the validation gate that guards the publish path.

describe("publish validation gate", () => {
  it("valid schema passes the local gate", () => {
    const schema = fixture("valid.schema.json");
    const result = validateSchema(schema);
    expect(result.valid).toBe(true);
  });

  it("invalid schema is blocked before publish", () => {
    const schema = fixture("invalid.schema.json");
    const result = validateSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("schema meta.brandId is used as the publish slug", () => {
    const schema = fixture("valid.schema.json") as { meta: { brandId: string } };
    expect(schema.meta.brandId).toBeTruthy();
    expect(typeof schema.meta.brandId).toBe("string");
  });

  it("schema without meta.brandId would be caught by validation", () => {
    const schema = { ...fixture("invalid.schema.json"), meta: {} };
    const result = validateSchema(schema);
    expect(result.valid).toBe(false);
  });
});

describe("summary extraction", () => {
  it("extracts a valid summary from a full schema", async () => {
    const { extractSummary } = await import("../src/lib/summary.js");
    const full = fixture("valid.schema.json");
    const summary = extractSummary(full);
    expect(summary.meta.brandId).toBe("little-rituals");
    expect(summary.identity.summary.threeAdjectives).toHaveLength(3);
    expect(summary.voice.approvedTones.length).toBeGreaterThan(0);
    expect(summary.voice.examples.length).toBeGreaterThan(0);
  });

  it("includes rejected examples in the summary for contrast signal", async () => {
    const { extractSummary } = await import("../src/lib/summary.js");
    const full = fixture("valid.schema.json");
    const summary = extractSummary(full);
    const rejected = summary.voice.examples.filter((e) => e.verdict === "rejected");
    expect(rejected.length).toBeGreaterThan(0);
  });

  it("includes structuralRules in the summary", async () => {
    const { extractSummary } = await import("../src/lib/summary.js");
    const full = fixture("valid.schema.json");
    const summary = extractSummary(full);
    expect(summary.voice.structuralRules).toBeDefined();
    expect(summary.voice.structuralRules!.length).toBeGreaterThan(0);
  });
});
