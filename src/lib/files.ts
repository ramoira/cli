import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

export function readJsonFile(filePath: string): unknown {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  return JSON.parse(readFileSync(abs, "utf8"));
}

export function writeJsonFile(filePath: string, data: unknown): void {
  const abs = resolve(filePath);
  writeFileSync(abs, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function fileExists(filePath: string): boolean {
  return existsSync(resolve(filePath));
}
