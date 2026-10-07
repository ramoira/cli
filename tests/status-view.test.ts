import { describe, it, expect } from "vitest";
import { statusLines } from "../src/lib/status-view.js";

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
