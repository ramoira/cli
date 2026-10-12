import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { createRequire } from "module";
import { tmpdir } from "os";
import { join } from "path";
import { DRAFTING_MD, DRAFTING_PATH, DRAFTING_VERSION, POINTER_BLOCK, draftingVersion, installDrafting, withPointerBlock } from "../src/lib/drafting.js";

const require = createRequire(import.meta.url);

let dir: string;
let cwd: string;
beforeEach(() => {
  cwd = process.cwd();
  dir = mkdtempSync(join(tmpdir(), "ramoira-init-"));
  process.chdir(dir);
});
afterEach(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("the drafting protocol (D20)", () => {
  it("is exactly the copy in the pinned spec package, with its version", () => {
    const pinned = readFileSync(require.resolve("@ramoira/schema/drafting/DRAFTING.md"), "utf8");
    expect(DRAFTING_MD).toBe(pinned);
    expect(DRAFTING_VERSION).toBe(draftingVersion(pinned));
    expect(DRAFTING_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("init installs it and adds the pointer section to AGENTS.md, creating it if needed", () => {
    const result = installDrafting();
    expect(readFileSync(DRAFTING_PATH, "utf8")).toBe(DRAFTING_MD);
    expect(readFileSync("AGENTS.md", "utf8")).toBe(`${POINTER_BLOCK}\n`);
    expect(result.steps.map((s) => [s.path, s.outcome])).toEqual([
      [DRAFTING_PATH, "created"],
      ["AGENTS.md", "created"],
    ]);
    expect(result.claudeMdMissing).toBe(true);
    expect(existsSync("CLAUDE.md")).toBe(false);
  });

  it("updates CLAUDE.md and Copilot instructions only where they exist, keeping what they say", () => {
    writeFileSync("CLAUDE.md", "# Project\n\nUse pnpm.\n");
    mkdirSync(".github");
    writeFileSync(".github/copilot-instructions.md", "Be brief.");
    installDrafting();
    expect(readFileSync("CLAUDE.md", "utf8")).toBe(`# Project\n\nUse pnpm.\n\n${POINTER_BLOCK}\n`);
    expect(readFileSync(".github/copilot-instructions.md", "utf8")).toContain("Be brief.\n\n<!-- ramoira:start -->");
  });

  it("is idempotent, and replaces an older section and an older protocol in place", () => {
    installDrafting();
    expect(installDrafting().steps.every((s) => s.outcome === "unchanged")).toBe(true);

    writeFileSync("AGENTS.md", "Intro.\n\n<!-- ramoira:start -->\nold text\n<!-- ramoira:end -->\n\nOutro.\n");
    writeFileSync(DRAFTING_PATH, "---\nid: drafting-protocol\nversion: 0.9.0\n---\nold\n");
    const result = installDrafting();
    expect(readFileSync("AGENTS.md", "utf8")).toBe(`Intro.\n\n${POINTER_BLOCK}\n\nOutro.\n`);
    expect(result.replacedVersion).toBe("0.9.0");
    expect(readFileSync(DRAFTING_PATH, "utf8")).toBe(DRAFTING_MD);
  });

  it("withPointerBlock appends once", () => {
    const once = withPointerBlock("A");
    expect(withPointerBlock(once)).toBe(once);
  });
});
