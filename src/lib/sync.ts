import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { RAMOIRA_DIR, writeJsonFile } from "./files.js";

// Where this project's schema stands against Ramoira, like a git branch's
// upstream (roadmap D20). Kept in the project, so it travels with the repo:
//   brand   the slug the schema is pushed to
//   base    the content_hash of the last version the owner reviewed, as pulled;
//           every push says which version it was based on
//   pushed  the content_hash of the last version pushed from here

export const SYNC_PATH = `${RAMOIRA_DIR}/sync.json`;

export interface SyncState {
  brand: string | null;
  base: string | null;
  pushed: string | null;
}

export function readSync(): SyncState {
  const empty: SyncState = { brand: null, base: null, pushed: null };
  const abs = resolve(SYNC_PATH);
  if (!existsSync(abs)) return empty;
  try {
    const s = JSON.parse(readFileSync(abs, "utf8")) as Partial<SyncState>;
    return { brand: s.brand ?? null, base: s.base ?? null, pushed: s.pushed ?? null };
  } catch {
    return empty;
  }
}

export function writeSync(state: SyncState): void {
  writeJsonFile(SYNC_PATH, state);
}
