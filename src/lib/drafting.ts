import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createRequire } from "module";
import DRAFTING_MD from "@ramoira/schema/drafting/DRAFTING.md";
import SPEC_MD from "@ramoira/schema/SPEC.md";
import SPEC_SCHEMA from "@ramoira/schema/SPEC.schema.json";
import EXAMPLE from "@ramoira/schema/examples/minimal/brand.schema.json";
import { RAMOIRA_DIR, writeTextFile } from "./files.js";
import { README_PATH, projectReadme, readmeIsOurs } from "./readme.js";

// The drafting protocol a coding agent follows to draft a candidate schema
// (roadmap D20). It ships in the spec package at the commit this CLI pins, so
// `init` installs exactly that copy. It is guidance for the agent: nothing
// depends on it arriving unmodified, because what matters is enforced at
// upload and in the owner's review.

export { DRAFTING_MD };
export const DRAFTING_PATH = `${RAMOIRA_DIR}/DRAFTING.md`;

/** The `version` in a DRAFTING.md frontmatter, or null. */
export function draftingVersion(text: string): string | null {
  const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  return /^version:\s*"?([^"\n]+)"?\s*$/m.exec(front)?.[1]?.trim() ?? null;
}

export const DRAFTING_VERSION = draftingVersion(DRAFTING_MD) ?? "unknown";

/** The spec version the bundled spec states ("**Version 3.1.0**" in SPEC.md). */
export const SPEC_VERSION = /\*\*Version ([0-9.]+)\*\*/.exec(SPEC_MD)?.[1] ?? "unknown";
// package.json sits one level above the bundle (dist/index.js) and two above this source file (in tests).
const CLI_VERSION: string = (() => {
  const require = createRequire(import.meta.url);
  for (const path of ["../package.json", "../../package.json"]) {
    try {
      const pkg = require(path) as { name?: string; version?: string };
      if (pkg.name === "ramoira" && pkg.version) return pkg.version;
    } catch {
      // Not at this level.
    }
  }
  return "unknown";
})();

// A local copy of the spec, so an agent without web access has the format.
export const SPEC_DIR = `${RAMOIRA_DIR}/spec`;
const specReadme = () => `# Ramoira spec, local copy

Installed by \`ramoira init\` (CLI ${CLI_VERSION}): brand schema spec ${SPEC_VERSION}, drafting protocol ${DRAFTING_VERSION}.
Run \`ramoira init\` again to refresh these files. They are the format reference for \`ramoira/DRAFTING.md\`;
use them rather than any other copy of Ramoira on this computer.

- \`SPEC.md\`: what every field means.
- \`SPEC.schema.json\`: the exact shape (JSON Schema).
- \`example.schema.json\`: the smallest valid file, for a fictional brand. Structure only; never copy its content.
`;
const SPEC_FILES = (): [string, string][] => [
  [`${SPEC_DIR}/README.md`, specReadme()],
  [`${SPEC_DIR}/SPEC.md`, SPEC_MD],
  [`${SPEC_DIR}/SPEC.schema.json`, JSON.stringify(SPEC_SCHEMA, null, 2) + "\n"],
  [`${SPEC_DIR}/example.schema.json`, JSON.stringify(EXAMPLE, null, 2) + "\n"],
];

/**
 * Whether the project's DRAFTING.md is the one this CLI ships. An agent may
 * otherwise follow an older (or newer) protocol than the CLI it runs.
 */
export function draftingDrift(): { project: string; cli: string } | null {
  const abs = resolve(DRAFTING_PATH);
  if (!existsSync(abs)) return null;
  const project = draftingVersion(readFileSync(abs, "utf8")) ?? "unknown";
  return project === DRAFTING_VERSION ? null : { project, cli: DRAFTING_VERSION };
}

/** One line for commands to print when the protocol and the CLI disagree. */
export function driftNotice(): string | null {
  const drift = draftingDrift();
  if (!drift) return null;
  return `ramoira/DRAFTING.md is version ${drift.project}; this CLI ships ${drift.cli}. Run ramoira init to refresh it (or update the CLI: npx ramoira@latest).`;
}

const START = "<!-- ramoira:start -->";
const END = "<!-- ramoira:end -->";

/** The section `init` keeps in the project's agent instruction files. */
export const POINTER_BLOCK = `${START}
## Brand schema

This project's brand schema is \`ramoira/brand.schema.json\`: one file that says what the brand means (what it makes and believes, how it sounds, which claims it may make, and the rules its content must keep), so every AI tool and writer here works from the same source and its rules can be checked. It is a candidate until the brand ratifies it. The format is Ramoira's open brand schema; a local copy of the spec is in \`ramoira/spec/\`.

- To draft or revise it, read \`ramoira/DRAFTING.md\` and follow it.
- Before writing copy or user-facing text, run \`npx ramoira status\`: if it says the file is behind, run \`npx ramoira pull\` first. Then read the schema and follow its rules. Make only the claims it lists.
- After drafting copy, run \`npx ramoira check --surface <surface> <file>\` and fix what it flags.
- When the person asks how review, publishing or the next version work, point them to \`ramoira/README.md\`.
${END}`;

/** Adds the pointer block to a file's text, or replaces the one already there. */
export function withPointerBlock(text: string): string {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start !== -1 && end > start) return text.slice(0, start) + POINTER_BLOCK + text.slice(end + END.length);
  const body = text.trimEnd();
  return body ? `${body}\n\n${POINTER_BLOCK}\n` : `${POINTER_BLOCK}\n`;
}

/** Instruction files, in the order reported. AGENTS.md is always written; the others only where they already exist. */
const INSTRUCTION_FILES = [
  { path: "AGENTS.md", always: true },
  { path: "CLAUDE.md", always: false },
  { path: ".github/copilot-instructions.md", always: false },
];

export type InstallStep = { path: string; outcome: "created" | "updated" | "unchanged" | "kept" };

export interface InstallResult {
  steps: InstallStep[];
  /** The version of the DRAFTING.md this replaced, when it was different. */
  replacedVersion: string | null;
  claudeMdMissing: boolean;
}

function writeIfChanged(path: string, next: string, steps: InstallStep[]): void {
  const abs = resolve(path);
  const before = existsSync(abs) ? readFileSync(abs, "utf8") : null;
  if (before === next) return void steps.push({ path, outcome: "unchanged" });
  writeTextFile(path, next);
  steps.push({ path, outcome: before === null ? "created" : "updated" });
}

/** Writes ramoira/README.md, the person's page, unless a README.md of their own is there ("kept"). */
export function installReadme(steps: InstallStep[] = []): InstallStep[] {
  if (!readmeIsOurs()) steps.push({ path: README_PATH, outcome: "kept" });
  else writeIfChanged(README_PATH, projectReadme({ cli: CLI_VERSION, spec: SPEC_VERSION, drafting: DRAFTING_VERSION }), steps);
  return steps;
}

/** Installs the drafting protocol and points the project's agent instruction files at it. */
export function installDrafting(): InstallResult {
  const steps: InstallStep[] = [];
  const existing = existsSync(resolve(DRAFTING_PATH)) ? readFileSync(resolve(DRAFTING_PATH), "utf8") : null;
  const previous = existing === null ? null : draftingVersion(existing);
  writeIfChanged(DRAFTING_PATH, DRAFTING_MD, steps);
  for (const [path, text] of SPEC_FILES()) writeIfChanged(path, text, steps);
  installReadme(steps);

  for (const file of INSTRUCTION_FILES) {
    const abs = resolve(file.path);
    if (!file.always && !existsSync(abs)) continue;
    writeIfChanged(file.path, withPointerBlock(existsSync(abs) ? readFileSync(abs, "utf8") : ""), steps);
  }

  return {
    steps,
    replacedVersion: existing !== null && previous !== DRAFTING_VERSION ? previous ?? "unknown" : null,
    claudeMdMissing: !existsSync(resolve("CLAUDE.md")),
  };
}
