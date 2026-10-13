import type { StatusResult } from "./api.js";

// The facts-field shape of `ramoira status` (roadmap rows C6, E2). Each line
// states a fact or says plainly that it is not available. No line is a score,
// and nothing here is read from the brand's own file.

export interface StatusLine {
  label: string;
  value: string;
  tone: "good" | "neutral" | "muted";
}

export function statusLines(slug: string, res: StatusResult): StatusLine[] {
  const published = res.workflowState === "published";
  const lines: StatusLine[] = [
    { label: "Brand", value: slug, tone: "neutral" },
    {
      label: "Published",
      value: published ? `yes — ${res.canonicalUrl ?? "summary is public"}` : `no (${res.workflowState})`,
      tone: published ? "good" : "muted",
    },
  ];

  lines.push(
    res.ratified
      ? {
          label: "Ratified",
          value: `yes — ${shortHash(res.ratified.hash)}, ${res.ratified.at.slice(0, 10)}, by ${res.ratified.role}`,
          tone: "good",
        }
      : { label: "Ratified", value: "no — candidate", tone: "muted" },
  );

  const c = res.conformance;
  lines.push(
    c?.active
      ? {
          label: "Conformance",
          value: `checking active — ${c.coverage ?? "coverage not reported"}, last checked ${c.last_checked?.slice(0, 10) ?? "never"}`,
          tone: "good",
        }
      : { label: "Conformance", value: "not checked (not available yet)", tone: "muted" },
  );

  lines.push({ label: "Faithfulness", value: "not available yet", tone: "muted" });

  lines.push(
    res.density
      ? { label: "Density", value: `${res.density.value} (diagnostic, ${res.density.checked_at.slice(0, 10)})`, tone: "neutral" }
      : { label: "Density", value: "not reported", tone: "muted" },
  );

  return lines;
}

function shortHash(hash: string): string {
  return hash.startsWith("sha256:") ? `sha256:${hash.slice(7, 19)}` : hash;
}

/**
 * Where this project's schema file stands against ramoira.com (roadmap D20),
 * so a person or agent sees when a newer version was reviewed or made public
 * (for example after Revise in the portal) before writing against an older
 * one. `reviewed` is known only with the owner's credential.
 */
export function fileStanding(input: {
  local: string | null;
  publicHash: string | null;
  publicVersion: string | null;
  reviewed: { hash: string; state: "public" | "reviewed" } | null;
  sync: { base: string | null; pushed: string | null };
}): StatusLine {
  const { local, publicHash, publicVersion, reviewed, sync } = input;
  const label = "Your file";
  if (!local) return { label, value: "no ramoira/brand.schema.json here", tone: "muted" };
  // A newer review comes first: even a file matching the public version is behind one the owner sent back.
  if (reviewed && reviewed.hash !== sync.base && reviewed.hash !== local) {
    return {
      label,
      value: `behind: the owner ${reviewed.state === "public" ? "made a newer version public" : "reviewed a newer version and sent it back"}. Run ramoira pull`,
      tone: "neutral",
    };
  }
  if (local === publicHash) return { label, value: `the public version${publicVersion ? ` (${publicVersion})` : ""}`, tone: "good" };
  if (local === sync.pushed) return { label, value: "pushed, waiting for the owner's review", tone: "neutral" };
  if (local === sync.base) {
    if (reviewed) return { label, value: "the version the owner last reviewed (sent back: see ramoira/REVIEW.md)", tone: "neutral" };
    // Without the owner's credential only the public version is known, not which is newer: say so, and how to find out.
    return {
      label,
      value: `not the public version${publicVersion ? ` (${publicVersion})` : ""}. Sign in (ramoira login) and run ramoira status to see whether it is newer`,
      tone: "neutral",
    };
  }
  return { label, value: "changed since the last push or pull. Push when it is ready for review", tone: "neutral" };
}
