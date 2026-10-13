import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { computeContentHash } from "@ramoira/schema";
import { planPush } from "../src/lib/push-plan.js";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

describe("ramoira push: what it sends (C4, D20)", () => {
  it("a valid full schema pushes to ramoira.brand_id", () => {
    const corvane = fixture("corvane.schema.json");
    expect(planPush(corvane)).toEqual({
      ok: true,
      slug: "corvane",
      schemaVersion: "1.0.0",
      contentHash: corvane.ramoira.content_hash,
      setsBrandId: false,
    });
  });

  it("takes the slug from --slug (or sync.json) when brand_id is empty, and says it will set it", () => {
    const doc = fixture("corvane.schema.json");
    doc.ramoira.brand_id = null;
    const plan = planPush(doc, "corvane-pans");
    expect(plan).toMatchObject({ ok: true, slug: "corvane-pans", setsBrandId: true });
  });

  it("refuses a slug that disagrees with brand_id, a missing slug, and a malformed one", () => {
    const a = planPush(fixture("corvane.schema.json"), "other-brand");
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.message).toMatch(/"corvane", not "other-brand"/);

    const none = fixture("corvane.schema.json");
    none.ramoira.brand_id = null;
    const b = planPush(none);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.message).toMatch(/--slug/);

    const c = planPush(none, "Not A Slug");
    expect(c.ok).toBe(false);
  });

  it("refuses 2.0.0 with the migration guide, and an invalid schema with the reasons", () => {
    const v2 = planPush(fixture("valid.schema.json"));
    expect(v2.ok).toBe(false);
    if (!v2.ok) expect(v2.message).toMatch(/2\.0\.0.*migrations/);

    const tampered = fixture("corvane.schema.json");
    tampered.rules[0].severity = "contextual";
    const bad = planPush(tampered);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.details?.length).toBeGreaterThan(0);
  });

  it("refuses a ratification pointer: ratification is recorded by Ramoira, not carried in a file", () => {
    const pointer = fixture("corvane.schema.json");
    pointer.ramoira.ratification = {
      ratification_id: "r",
      ratified_hash: pointer.ramoira.content_hash,
      ratified_at: "2026-10-07T00:00:00Z",
      ratifier_role: "brand_owner",
    };
    pointer.ramoira.content_hash = computeContentHash(pointer);
    const plan = planPush(pointer);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.message).toMatch(/ratification/);
  });
});
