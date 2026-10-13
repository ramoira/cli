import { describe, it, expect } from "vitest";
import { fileStanding, statusLines } from "../src/lib/status-view.js";

const value = (lines: ReturnType<typeof statusLines>, label: string) =>
  lines.find((l) => l.label === label)?.value;

describe("statusLines", () => {
  it("renders the facts-field shape when the server returns only publication state", () => {
    const lines = statusLines("corvane", {
      workflowState: "published",
      canonicalUrl: "https://ramoira.com/brands/corvane/schema.summary.json",
    });
    expect(lines.map((l) => l.label)).toEqual(["Brand", "Published", "Ratified", "Conformance", "Faithfulness", "Density"]);
    expect(value(lines, "Ratified")).toBe("no — candidate");
    expect(value(lines, "Conformance")).toMatch(/not available yet/);
    expect(value(lines, "Faithfulness")).toBe("not available yet");
  });

  it("shows ratification and checking facts when present", () => {
    const lines = statusLines("corvane", {
      workflowState: "published",
      canonicalUrl: null,
      ratified: { hash: "sha256:eaed480d372bcbef2cee", at: "2026-10-07T10:00:00Z", role: "founder" },
      conformance: { active: true, coverage: "complete", last_checked: "2026-10-08T09:00:00Z" },
      density: { value: "thin in commercial", checked_at: "2026-10-08T09:00:00Z" },
    });
    expect(value(lines, "Ratified")).toBe("yes — sha256:eaed480d372b, 2026-10-07, by founder");
    expect(value(lines, "Conformance")).toBe("checking active — complete, last checked 2026-10-08");
    expect(value(lines, "Density")).toMatch(/diagnostic/);
  });

  it("never reports a score", () => {
    const text = JSON.stringify(statusLines("x", { workflowState: "draft", canonicalUrl: null }));
    expect(text).not.toMatch(/certified|confidence|score/i);
  });
});

describe("fileStanding: where this project's file stands", () => {
  const at = (over: Partial<Parameters<typeof fileStanding>[0]>) =>
    fileStanding({ local: "h1", publicHash: "h1", publicVersion: "0.1.0", reviewed: null, sync: { base: "h1", pushed: null }, ...over }).value;

  it("says when the file is the public version, pushed, or changed", () => {
    expect(at({})).toBe("the public version (0.1.0)");
    expect(at({ local: "h2", sync: { base: "h1", pushed: "h2" } })).toMatch(/waiting for the owner's review/);
    expect(at({ local: "h3", sync: { base: "h1", pushed: "h2" } })).toMatch(/changed since the last push/);
    expect(at({ local: null })).toMatch(/no ramoira/);
  });

  it("says pull when the owner reviewed or made public a newer version, e.g. after Revise", () => {
    const revised = { publicHash: "h2", publicVersion: "0.1.1", reviewed: { hash: "h2", state: "public" as const } };
    expect(at(revised)).toBe("behind: the owner made a newer version public. Run ramoira pull");
    expect(at({ reviewed: { hash: "h2", state: "reviewed" } })).toMatch(/sent it back. Run ramoira pull/);
    // Without the owner's credential, only the public version is known.
    expect(at({ publicHash: "h2", publicVersion: "0.1.1" })).toMatch(/not the public version \(0\.1\.1\)\. Sign in/);
    expect(at({ local: "h2", publicHash: "h1", reviewed: { hash: "h2", state: "reviewed" }, sync: { base: "h2", pushed: null } })).toMatch(/sent back: see ramoira\/REVIEW.md/);
  });
});
