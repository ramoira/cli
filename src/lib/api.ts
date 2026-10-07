import { getApiBase, getToken } from "./config.js";

export interface PublishResult {
  versionId: string;
  workflowState: string;
  canonicalUrl: string;
  contentHash?: string;
  schemaVersion?: string;
  /** This exact content_hash was already the published version. */
  unchanged?: boolean;
  /** This publish claimed the slug for the account. */
  claimed?: boolean;
}

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
}

export async function publishSchema(
  slug: string,
  schema: Record<string, unknown>,
): Promise<PublishResult> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated. Run: ramoira login");

  const base = getApiBase();
  const res = await fetch(`${base}/api/brands/${slug}/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ schema }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; issues?: Array<{ path: string; message: string }> };
    const issues = (body.issues ?? []).map((i) => `\n  · ${i.path} ${i.message}`).join("");
    throw new Error(`${body.error ?? `Publish failed (${res.status})`}${issues}`);
  }

  return res.json() as Promise<PublishResult>;
}

export async function fetchStatus(slug: string): Promise<StatusResult> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/brands/${slug}/status`);
  if (res.status === 404) throw new Error(`Brand "${slug}" not found on ramoira.com`);
  if (!res.ok) throw new Error(`Status check failed (${res.status})`);
  return res.json() as Promise<StatusResult>;
}
