import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readJsonFile, writeJsonFile, fileExists } from "../src/lib/files.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = resolve(__dirname, "../tmp");

beforeEach(() => mkdirSync(TMP, { recursive: true }));
afterEach(() => {
  const f = resolve(TMP, "test-write.json");
  if (existsSync(f)) unlinkSync(f);
});

describe("files.ts", () => {
  it("reads a JSON file", () => {
    const path = resolve(TMP, "test-read.json");
    writeFileSync(path, JSON.stringify({ hello: "world" }), "utf8");
    const data = readJsonFile(path) as { hello: string };
    expect(data.hello).toBe("world");
    unlinkSync(path);
  });

  it("throws when file does not exist", () => {
    expect(() => readJsonFile(resolve(TMP, "nonexistent.json"))).toThrow("File not found");
  });

  it("writes and reads back a JSON file", () => {
    const path = resolve(TMP, "test-write.json");
    writeJsonFile(path, { brand: "little-rituals" });
    const back = readJsonFile(path) as { brand: string };
    expect(back.brand).toBe("little-rituals");
  });

  it("fileExists returns false for missing file", () => {
    expect(fileExists(resolve(TMP, "nonexistent.json"))).toBe(false);
  });

  it("fileExists returns true for existing file", () => {
    const path = resolve(TMP, "test-exists.json");
    writeFileSync(path, "{}", "utf8");
    expect(fileExists(path)).toBe(true);
    unlinkSync(path);
  });
});

describe("generator extractJson", () => {
  it("strips markdown fences from LLM output", async () => {
    const { extractJson } = await import("../src/lib/generator.js");
    const raw = "Here is the schema:\n```json\n{\"meta\":{\"brandId\":\"test\"}}\n```\nDone.";
    expect(extractJson(raw)).toEqual({ meta: { brandId: "test" } });
  });

  it("parses bare JSON without fences", async () => {
    const { extractJson } = await import("../src/lib/generator.js");
    const raw = '{"meta":{"brandId":"test"}}';
    expect(extractJson(raw)).toEqual({ meta: { brandId: "test" } });
  });

  it("throws on unparseable response", async () => {
    const { extractJson } = await import("../src/lib/generator.js");
    expect(() => extractJson("No JSON here at all")).toThrow();
  });
});
