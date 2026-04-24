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

  it("rejects schema missing all six required keys", () => {
    const result = validateSchema({});
    expect(result.valid).toBe(false);
    const joined = result.errors.join(" ");
    expect(joined).toMatch(/meta/);
    expect(joined).toMatch(/identity/);
    expect(joined).toMatch(/narrative/);
    expect(joined).toMatch(/voice/);
    expect(joined).toMatch(/commercial/);
    expect(joined).toMatch(/governance/);
  });
});
