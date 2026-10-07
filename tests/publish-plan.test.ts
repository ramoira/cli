import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { computeContentHash } from "@ramoira/schema";
import { planPublish } from "../src/lib/publish-plan.js";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

describe("ramoira publish: what it sends (C4)", () => {
  it("a valid 3.0.0 full schema publishes to ramoira.brand_id", () => {
    const corvane = fixture("corvane.schema.json");
    expect(planPublish(corvane)).toEqual({
      ok: true,
      slug: "corvane",
      schemaVersion: "1.0.0",
      contentHash: corvane.ramoira.content_hash,
    });
  });

  it("refuses 2.0.0 with the migration guide", () => {
    const plan = planPublish(fixture("valid.schema.json"));
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.message).toMatch(/2\.0\.0.*migrations/);
  });

  it("refuses an invalid schema, listing why", () => {
    const tampered = fixture("corvane.schema.json");
    tampered.rules[0].severity = "contextual";
    const plan = planPublish(tampered);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.details?.length).toBeGreaterThan(0);
  });

  it("refuses a schema with no slug, or one carrying a ratification pointer", () => {
    const noSlug = fixture("corvane.schema.json");
    noSlug.ramoira.brand_id = null;
    const a = planPublish(noSlug);
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.message).toMatch(/brand_id/);

    const pointer = fixture("corvane.schema.json");
    pointer.ramoira.ratification = {
      ratification_id: "r",
      ratified_hash: pointer.ramoira.content_hash,
      ratified_at: "2026-10-07T00:00:00Z",
      ratifier_role: "brand_owner",
    };
    pointer.ramoira.content_hash = computeContentHash(pointer);
    const b = planPublish(pointer);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.message).toMatch(/ratification/);
  });
});
