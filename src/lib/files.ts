import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

export function readJsonFile(filePath: string): unknown {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  return JSON.parse(readFileSync(abs, "utf8"));
}

function escapeNonAscii(json: string): string {
  return json.replace(/[^\x00-\x7F]/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xffff) {
      return `\\u${cp.toString(16).padStart(4, "0")}`;
    }
    // Supplementary plane — emit surrogate pair
    const offset = cp - 0x10000;
    const high = 0xd800 + Math.floor(offset / 0x400);
    const low = 0xdc00 + (offset % 0x400);
    return `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
  });
}

export function writeJsonFile(filePath: string, data: unknown): void {
  const abs = resolve(filePath);
  const json = escapeNonAscii(JSON.stringify(data, null, 2));
  writeFileSync(abs, json + "\n", "utf8");
}

export function fileExists(filePath: string): boolean {
  return existsSync(resolve(filePath));
}
