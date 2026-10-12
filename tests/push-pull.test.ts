import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { computeContentHash } from "@ramoira/schema";
import { pushCommand } from "../src/commands/push.js";
import { pullCommand, BRIEF_PATH } from "../src/commands/pull.js";
import { hashCommand } from "../src/commands/hash.js";
import { readSync, SYNC_PATH } from "../src/lib/sync.js";

// push and pull against the platform-v3 contract (roadmap D20):
//   POST /api/brands/<slug>/proposals {schema, base_hash} -> {proposal_id, content_hash, review_url, unchanged, claimed}
//                                                          409 {code: "stale_base"} when the base is out of date
//   GET  /api/brands/<slug>/reviewed -> {content_hash, schema, state, reviewed_at, brief} | 404

const fixturePath = new URL("./fixtures/corvane.schema.json", import.meta.url);
const corvane = () => JSON.parse(readFileSync(fixturePath, "utf8"));
const SCHEMA = "ramoira/brand.schema.json";

let dir: string;
let cwd: string;
let calls: Array<{ url: string; init?: RequestInit }>;
let respond: (url: string, init?: RequestInit) => Response;

beforeEach(() => {
  cwd = process.cwd();
  dir = mkdtempSync(join(tmpdir(), "ramoira-push-"));
  process.chdir(dir);
  mkdirSync("ramoira");
  process.env.RAMOIRA_TOKEN = "rmr_test";
  process.env.RAMOIRA_API_URL = "https://ramoira.test";
  process.env.RAMOIRA_CONFIG_DIR = join(dir, ".config");
  calls = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return respond(url, init);
  });
  vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new Error(`exit ${code}`);
  }) as never);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.RAMOIRA_TOKEN;
  delete process.env.RAMOIRA_API_URL;
  delete process.env.RAMOIRA_CONFIG_DIR;
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const write = (doc: unknown) => writeFileSync(SCHEMA, JSON.stringify(doc, null, 2));
const read = () => JSON.parse(readFileSync(SCHEMA, "utf8"));

describe("ramoira hash", () => {
  it("--write fills in a stale content_hash", async () => {
    const doc = corvane();
    doc.ramoira.content_hash = "";
    write(doc);
    await hashCommand(undefined, { write: true });
    expect(read().ramoira.content_hash).toBe(computeContentHash(corvane()));
  });
});

describe("ramoira push", () => {
  it("uploads a private proposal with its base, records it in sync.json, and never publishes", async () => {
    const doc = corvane();
    write(doc);
    respond = () =>
      json({ proposal_id: "prp_1", content_hash: doc.ramoira.content_hash, review_url: "https://ramoira.test/dashboard/corvane/review/prp_1", unchanged: false, claimed: true }, 201);
    await pushCommand(undefined, {});
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://ramoira.test/api/brands/corvane/proposals");
    expect(calls[0].init?.method).toBe("POST");
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe("Bearer rmr_test");
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body).toEqual({ schema: doc, base_hash: null });
    expect(readSync()).toEqual({ brand: "corvane", base: null, pushed: doc.ramoira.content_hash });
    expect(calls.some((c) => c.url.includes("/publish"))).toBe(false);
  });

  it("sends the reviewed base it was pulled from, and stops with a pull hint when that base is stale", async () => {
    write(corvane());
    writeFileSync(SYNC_PATH, JSON.stringify({ brand: "corvane", base: "sha256:old", pushed: null }));
    respond = () => json({ error: "Out of date.", code: "stale_base", reviewed_hash: "sha256:new" }, 409);
    await expect(pushCommand(undefined, {})).rejects.toThrow("exit 1");
    expect(JSON.parse(String(calls[0].init?.body)).base_hash).toBe("sha256:old");
    expect(readSync().pushed).toBeNull();
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).toMatch(/ramoira pull/);
  });

  it("sets brand_id from --slug without changing the fingerprint", async () => {
    const doc = corvane();
    doc.ramoira.brand_id = null;
    write(doc);
    respond = () => json({ proposal_id: "prp_2", content_hash: doc.ramoira.content_hash, review_url: "u", unchanged: false, claimed: false }, 201);
    await pushCommand(undefined, { slug: "corvane-pans" });
    expect(read().ramoira.brand_id).toBe("corvane-pans");
    expect(computeContentHash(read())).toBe(doc.ramoira.content_hash);
    expect(calls[0].url).toContain("/api/brands/corvane-pans/proposals");
  });

  it("makes no call for an invalid schema, or without a credential", async () => {
    const bad = corvane();
    bad.rules[0].severity = "contextual";
    write(bad);
    await expect(pushCommand(undefined, {})).rejects.toThrow("exit 1");
    write(corvane());
    delete process.env.RAMOIRA_TOKEN;
    await expect(pushCommand(undefined, {})).rejects.toThrow("exit 1");
    expect(calls).toHaveLength(0);
  });
});

describe("ramoira pull", () => {
  const reviewedDoc = () => {
    const d = corvane();
    d.rules[0].affirmed = true;
    d.ramoira.content_hash = computeContentHash(d);
    return d;
  };

  it("writes the reviewed version and the owner's brief, and moves the base", async () => {
    const pushed = corvane();
    write(pushed);
    writeFileSync(SYNC_PATH, JSON.stringify({ brand: "corvane", base: null, pushed: pushed.ramoira.content_hash }));
    const reviewed = reviewedDoc();
    respond = () =>
      json({
        content_hash: reviewed.ramoira.content_hash,
        schema: reviewed,
        state: "reviewed",
        reviewed_at: "2026-10-12T10:00:00Z",
        brief: { requests: [{ path: "/narrative/pillars", text: "Add a pillar about repair." }], decisions: [{ kind: "deleted", rule_id: "r_x", note: "too formal" }] },
      });
    await pullCommand(undefined, {});
    expect(calls[0].url).toBe("https://ramoira.test/api/brands/corvane/reviewed");
    expect(read()).toEqual(reviewed);
    expect(readSync().base).toBe(reviewed.ramoira.content_hash);
    const brief = readFileSync(BRIEF_PATH, "utf8");
    expect(brief).toContain("Add a pillar about repair.");
    expect(brief).toContain('deleted rule `r_x`: "too formal"');
  });

  it("refuses to overwrite changes that were never pushed, unless --force", async () => {
    const local = corvane();
    local.voice.approvedTones.push("brand new tone");
    local.ramoira.content_hash = computeContentHash(local);
    write(local);
    writeFileSync(SYNC_PATH, JSON.stringify({ brand: "corvane", base: null, pushed: "sha256:something-else" }));
    const reviewed = reviewedDoc();
    respond = () => json({ content_hash: reviewed.ramoira.content_hash, schema: reviewed, state: "public", reviewed_at: "2026-10-12T10:00:00Z", brief: null });
    await expect(pullCommand(undefined, {})).rejects.toThrow("exit 1");
    expect(read()).toEqual(local);
    await pullCommand(undefined, { force: true });
    expect(read()).toEqual(reviewed);
    expect(existsSync(BRIEF_PATH)).toBe(false);
  });

  it("says so when nothing has been reviewed yet", async () => {
    write(corvane());
    respond = () => json({ error: "none" }, 404);
    await pullCommand(undefined, {});
    expect(read()).toEqual(corvane());
  });
});
