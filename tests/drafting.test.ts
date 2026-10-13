import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { createRequire } from "module";
import { tmpdir } from "os";
import { join } from "path";
import { DRAFTING_MD, DRAFTING_PATH, DRAFTING_VERSION, POINTER_BLOCK, SPEC_VERSION, draftingVersion, driftNotice, installDrafting, withPointerBlock } from "../src/lib/drafting.js";
import { README_MARKER } from "../src/lib/readme.js";

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
      ["ramoira/spec/README.md", "created"],
      ["ramoira/spec/SPEC.md", "created"],
      ["ramoira/spec/SPEC.schema.json", "created"],
      ["ramoira/spec/example.schema.json", "created"],
      ["ramoira/README.md", "created"],
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

  it("installs a local copy of the spec, so an agent without web access has the format", () => {
    installDrafting();
    expect(readFileSync("ramoira/spec/SPEC.md", "utf8")).toBe(readFileSync(require.resolve("@ramoira/schema/SPEC.md"), "utf8"));
    expect(JSON.parse(readFileSync("ramoira/spec/SPEC.schema.json", "utf8"))).toEqual(JSON.parse(readFileSync(require.resolve("@ramoira/schema/SPEC.schema.json"), "utf8")));
    expect(readFileSync("ramoira/spec/README.md", "utf8")).toContain(`drafting protocol ${DRAFTING_VERSION}`);
    expect(SPEC_VERSION).toMatch(/^3\.\d+\.\d+$/);
  });

  it("writes the person's README, refreshes its own, and leaves one the person wrote alone", () => {
    installDrafting();
    const readme = readFileSync("ramoira/README.md", "utf8");
    expect(readme).toContain(README_MARKER);
    for (const step of ["ramoira push", "Make public", "ramoira pull", "Revise", "Always pull after a review"]) expect(readme).toContain(step);
    expect(readme).toContain(`drafting protocol ${DRAFTING_VERSION}`);
    writeFileSync("ramoira/README.md", `${README_MARKER}\nold page\n`);
    expect(installDrafting().steps.find((s) => s.path === "ramoira/README.md")!.outcome).toBe("updated");
    writeFileSync("ramoira/README.md", "# Our own notes\n");
    expect(installDrafting().steps.find((s) => s.path === "ramoira/README.md")!.outcome).toBe("kept");
    expect(readFileSync("ramoira/README.md", "utf8")).toBe("# Our own notes\n");
  });

  it("notices when the project's DRAFTING.md is not the one this CLI ships", () => {
    expect(driftNotice()).toBeNull();
    installDrafting();
    expect(driftNotice()).toBeNull();
    writeFileSync(DRAFTING_PATH, "---\nid: drafting-protocol\nversion: 1.0.0\n---\nold\n");
    expect(driftNotice()).toMatch(/version 1\.0\.0; this CLI ships .*Run ramoira init/);
  });

  it("withPointerBlock appends once", () => {
    const once = withPointerBlock("A");
    expect(withPointerBlock(once)).toBe(once);
  });
});
