import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { generateAgentsMd } from "../src/lib/agents-md.js";

const corvane = () => JSON.parse(readFileSync(new URL("./fixtures/corvane.schema.json", import.meta.url), "utf8"));

describe("generateAgentsMd", () => {
  it("is built from the public summary: candidate label, public rules, no private rules", () => {
    const md = generateAgentsMd(corvane());
    expect(md).toContain("Candidate — not ratified");
    expect(md).toContain("plain-spoken");
    expect(md).not.toContain("Ironhold");
    expect(md).not.toContain("last chance");
  });
});
