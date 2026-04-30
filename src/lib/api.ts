import { getApiBase, getToken } from "./config.js";

export interface PublishResult {
  versionId: string;
  workflowState: string;
  canonicalUrl: string;
  certified: boolean;
  confidence: number;
}

export interface StatusResult {
  workflowState: string;
  certified: boolean;
  confidence: number;
  canonicalUrl: string | null;
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
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body.error as string) ?? `Publish failed (${res.status})`);
  }

  return res.json() as Promise<PublishResult>;
}

export async function generateBook(
  slug: string,
  schema: Record<string, unknown>,
): Promise<string> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated. Run: ramoira login");

  const base = getApiBase();
  const res = await fetch(`${base}/api/brands/${slug}/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ schema }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body.error as string) ?? `Brand book generation failed (${res.status})`);
  }

  return res.text();
}

export async function fetchStatus(slug: string): Promise<StatusResult> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/brands/${slug}/status`);
  if (res.status === 404) throw new Error(`Brand "${slug}" not found on ramoira.com`);
  if (!res.ok) throw new Error(`Status check failed (${res.status})`);
  return res.json() as Promise<StatusResult>;
}
