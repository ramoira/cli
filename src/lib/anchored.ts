// `ramoira init --anchored` (roadmap D7, D18): the archetype-anchored session
// is a free hosted Ramoira service, with no account. The CLI starts a session,
// opens it in the browser, and waits for the candidate. The archetype
// templates never ship in this CLI (D7, D13): it only ever receives the
// finished candidate, assembled on the server from the template and the
// person's own answers, without a model (D18).

type Fetch = typeof fetch;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface AnchoredSession {
  token: string;
  /** The page to open. The token rides in the fragment, which browsers never send to a server. */
  url: string;
}

export async function startAnchoredSession(base: string, f: Fetch = fetch): Promise<AnchoredSession> {
  const res = await f(`${base}/api/drafting/sessions`, { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!res.ok || !body.token) throw new Error(body.error ?? `Could not start a drafting session (${res.status}).`);
  return { token: body.token, url: sessionUrl(base, body.token) };
}

export const sessionUrl = (base: string, token: string) => `${base}/draft#t=${token}`;

/** Whether a saved session can still be continued. */
export async function sessionIsLive(base: string, token: string, f: Fetch = fetch): Promise<boolean> {
  const res = await f(`${base}/api/drafting/session`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  return res?.ok === true;
}

export type CandidatePoll =
  | { state: "done"; schema: Record<string, unknown> }
  | { state: "pending"; step: string }
  | { state: "gone"; message: string };

export async function fetchCandidate(base: string, token: string, f: Fetch = fetch): Promise<CandidatePoll> {
  const res = await f(`${base}/api/drafting/session/candidate`, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 200) return { state: "done", schema: body };
  if (res.status === 409) return { state: "pending", step: String(body.step ?? "") };
  return { state: "gone", message: String(body.error ?? `The drafting service answered ${res.status}.`) };
}

/** Polls until the session is finished, it is gone, or the deadline passes (then null). */
export async function waitForCandidate(
  base: string,
  token: string,
  { intervalMs = 5000, deadline = Date.now() + 2 * 3600_000, f = fetch, onStep }: { intervalMs?: number; deadline?: number; f?: Fetch; onStep?: (step: string) => void } = {},
): Promise<CandidatePoll | null> {
  while (Date.now() < deadline) {
    let poll: CandidatePoll;
    try {
      poll = await fetchCandidate(base, token, f);
    } catch {
      await sleep(intervalMs); // transient network error
      continue;
    }
    if (poll.state !== "pending") return poll;
    onStep?.(poll.step);
    await sleep(intervalMs);
  }
  return null;
}
