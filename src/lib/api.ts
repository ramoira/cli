import { getApiBase, getToken } from "./config.js";

// /status reports facts, never a score (roadmap E2). Today the server returns
// only workflowState and canonicalUrl; the other fields are read when present.
export interface StatusResult {
  workflowState: string;
  canonicalUrl: string | null;
  ratified?: { hash: string; at: string; role: string } | null;
  conformance?: {
    active: boolean;
    coverage: "sampled" | "complete" | null;
    last_checked: string | null;
  } | null;
  /** Absent until independent faithfulness attestation exists. */
  faithfulness?: null;
  /** A diagnostic, reported separately; never a quality score. */
  density?: { value: string; checked_at: string } | null;
  /** The public version, when there is one. */
  published?: { at: string; schema_version: string; content_hash: string } | null;
}

/** What Ramoira returns for a push: a private, proposed version (roadmap D20). */
export interface PushResult {
  proposal_id: string;
  content_hash: string;
  /** Where the owner reviews it, signed in. */
  review_url: string;
  /** This exact content_hash was already proposed or reviewed. */
  unchanged: boolean;
  /** This push claimed the slug for the account. */
  claimed: boolean;
}

/** The owner's own requests and decisions, from "Send back" in the review. Never Ramoira's suggestions. */
export interface ReviewBrief {
  requests: Array<{ path?: string | null; text: string }>;
  decisions: Array<{ kind: string; rule_id?: string | null; path?: string | null; note?: string | null }>;
}

export interface Reviewed {
  content_hash: string;
  schema: Record<string, unknown>;
  /** "public" once the owner made it public; "reviewed" while it is still private. */
  state: "reviewed" | "public";
  reviewed_at: string;
  brief: ReviewBrief | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: Record<string, any>,
  ) {
    super(message);
  }
}

async function failure(res: Response, what: string): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }> };
  const issues = (body.issues ?? []).map((i) => `\n  · ${i.path} ${i.message}`).join("");
  return new ApiError(res.status, `${body.error ?? `${what} failed (${res.status})`}${issues}`, body);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) throw new Error("Not signed in. Run: ramoira login (free), or set RAMOIRA_TOKEN.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

/** POST /api/brands/<slug>/proposals: uploads a private, proposed version. Never makes anything public. */
export async function pushProposal(slug: string, schema: Record<string, unknown>, baseHash: string | null): Promise<PushResult> {
  const res = await fetch(`${getApiBase()}/api/brands/${slug}/proposals`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ schema, base_hash: baseHash }),
  });
  if (!res.ok) throw await failure(res, "Push");
  return res.json() as Promise<PushResult>;
}

/** GET /api/brands/<slug>/reviewed: the last version the owner reviewed, with their brief. Null if none yet. */
export async function fetchReviewed(slug: string): Promise<Reviewed | null> {
  const res = await fetch(`${getApiBase()}/api/brands/${slug}/reviewed`, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw await failure(res, "Pull");
  return res.json() as Promise<Reviewed>;
}

export async function fetchStatus(slug: string): Promise<StatusResult> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/brands/${slug}/status`);
  if (res.status === 404) throw new Error(`Brand "${slug}" not found on ramoira.com`);
  if (!res.ok) throw new Error(`Status check failed (${res.status})`);
  return res.json() as Promise<StatusResult>;
}
