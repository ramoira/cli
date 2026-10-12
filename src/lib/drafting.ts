import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import DRAFTING_MD from "@ramoira/schema/drafting/DRAFTING.md";
import { RAMOIRA_DIR, writeTextFile } from "./files.js";

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

const START = "<!-- ramoira:start -->";
const END = "<!-- ramoira:end -->";

/** The section `init` keeps in the project's agent instruction files. */
export const POINTER_BLOCK = `${START}
## Brand schema

This project's brand schema is \`ramoira/brand.schema.json\`: a candidate until the brand ratifies it.

- To draft or revise it, read \`ramoira/DRAFTING.md\` and follow it.
- Before writing copy or user-facing text, read the schema and follow its rules. Make only the claims it lists.
- After drafting copy, run \`npx ramoira check --surface <surface> <file>\` and fix what it flags.
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

export type InstallStep = { path: string; outcome: "created" | "updated" | "unchanged" };

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

/** Installs the drafting protocol and points the project's agent instruction files at it. */
export function installDrafting(): InstallResult {
  const steps: InstallStep[] = [];
  const existing = existsSync(resolve(DRAFTING_PATH)) ? readFileSync(resolve(DRAFTING_PATH), "utf8") : null;
  const previous = existing === null ? null : draftingVersion(existing);
  writeIfChanged(DRAFTING_PATH, DRAFTING_MD, steps);

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
