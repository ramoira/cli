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
