import { describe, expect, it } from "vitest";
import { fetchCandidate, sessionUrl, startAnchoredSession, waitForCandidate } from "../src/lib/anchored.js";

const BASE = "https://ramoira.test";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("init --anchored (D7, D18)", () => {
  it("starts a session with no account and puts the token in the URL fragment only", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const f = (async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      return json(201, { token: "dft_abc", step: "intake" });
    }) as typeof fetch;
    const s = await startAnchoredSession(BASE, f);
    expect(s).toEqual({ token: "dft_abc", url: `${BASE}/draft#t=dft_abc` });
    expect(calls[0][0]).toBe(`${BASE}/api/drafting/sessions`);
    expect(JSON.stringify(calls[0][1]?.headers ?? {})).not.toMatch(/authorization/i);
    expect(sessionUrl(BASE, "dft_x").split("#")[0]).toBe(`${BASE}/draft`);
  });

  it("refuses with the server's message (e.g. the rate limit)", async () => {
    const f = (async () => json(429, { error: "Too many new drafting sessions from here." })) as unknown as typeof fetch;
    await expect(startAnchoredSession(BASE, f)).rejects.toThrow(/Too many/);
  });

  it("waits while the session is unfinished, then returns the candidate", async () => {
    const answers = [json(409, { error: "not finished", step: "contrast" }), json(409, { step: "facts" }), json(200, { ramoira: { spec_version: "3.1.0" } })];
    const steps: string[] = [];
    const f = (async (_url: string, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer dft_abc");
      return answers.shift()!;
    }) as typeof fetch;
    const poll = await waitForCandidate(BASE, "dft_abc", { intervalMs: 1, f, onStep: (s) => steps.push(s) });
    expect(poll).toEqual({ state: "done", schema: { ramoira: { spec_version: "3.1.0" } } });
    expect(steps).toEqual(["contrast", "facts"]);
  });

  it("reports an expired session, and gives up at the deadline", async () => {
    const gone = (async () => json(404, { error: "This drafting session has expired" })) as unknown as typeof fetch;
    expect(await fetchCandidate(BASE, "dft_abc", gone)).toEqual({ state: "gone", message: "This drafting session has expired" });
    const pending = (async () => json(409, { step: "rules" })) as unknown as typeof fetch;
    expect(await waitForCandidate(BASE, "dft_abc", { intervalMs: 1, deadline: Date.now() + 20, f: pending })).toBeNull();
  });
});
