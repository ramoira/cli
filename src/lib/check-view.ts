import type { CheckResult } from "@ramoira/schema/checker";
import { surfaceLabel } from "./surfaces.js";

// Plain-text rendering of a check result. It flags, cites the span and the
// rule, and stops: no suggested fix, ever (RMT1).

type Obj = Record<string, any>;

export type Tone = "fail" | "review" | "log" | "muted" | "ok" | "plain";
export interface Line {
  tone: Tone;
  text: string;
}

const VERDICT_LABEL: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  review_required: "Needs review",
  not_certifiable: "Not certifiable",
  not_evaluable: "Not evaluable",
};

/** Exit codes, stable for CI: 0 pass, 1 fail, 2 needs review, 3 could not check. */
export function exitCode(results: CheckResult[]): number {
  if (results.some((r) => r.event.verdict === "not_evaluable")) return 3;
  if (results.some((r) => r.findingsVerdict === "fail")) return 1;
  if (results.some((r) => r.findingsVerdict === "review_required")) return 2;
  return 0;
}

export function headerLines(schema: Obj, surface: string, mode: string, judged: boolean): Line[] {
  const r = schema.ramoira;
  const standing = r.ratification ? "has a ratification pointer" : "candidate — not ratified";
  const hint: Line[] = judged ? [] : [{ tone: "muted", text: "Set ANTHROPIC_API_KEY to judge them with your own model." }];
  return [
    { tone: "plain", text: `${r.brand_id ?? "unassigned"} ${r.schema_version} (${String(r.content_hash).slice(0, 19)}…) · ${standing}` },
    {
      tone: "muted",
      text: `Surface: ${surfaceLabel(surface)} · ${mode === "principal_commissioned" ? "brand's own check" : "producer self-check"} · tooling only${judged ? "" : " · judged rules not run (no model key)"}`,
    },
    ...hint,
  ];
}

const shortHash = (s: string) => s.replace(/sha256:([0-9a-f]{12})[0-9a-f]{52}/g, "sha256:$1…");

export function resultLines(name: string, result: CheckResult, schema: Obj): Line[] {
  const { event, findingsVerdict, notes, outOfScope } = result;
  const statement = new Map<string, string>((schema.rules ?? []).map((r: Obj) => [r.rule_id, r.statement]));
  const lines: Line[] = [];

  const verdict =
    event.verdict === findingsVerdict
      ? VERDICT_LABEL[event.verdict]
      : event.verdict === "not_certifiable"
        ? `${VERDICT_LABEL.not_certifiable} (findings: ${VERDICT_LABEL[findingsVerdict].toLowerCase()})`
        : VERDICT_LABEL[event.verdict];
  const verdictTone: Tone = findingsVerdict === "fail" ? "fail" : findingsVerdict === "review_required" ? "review" : "ok";
  lines.push({ tone: event.verdict === "not_evaluable" ? "muted" : verdictTone, text: `${name} — ${verdict}` });

  const cite = (f: Obj) => (statement.get(f.rule_id) ? `    ${statement.get(f.rule_id)}` : null);
  const order = { absolute: 0, strong: 1, contextual: 2 } as const;
  const violations = event.findings
    .filter((f) => f.outcome === "violation")
    .sort((a, b) => order[a.severity] - order[b.severity]);
  for (const f of violations) {
    const tone: Tone = f.severity === "absolute" ? "fail" : f.severity === "strong" ? "review" : "log";
    lines.push({ tone, text: `  ${f.severity.padEnd(10)} ${f.rule_id}${f.span ? `  "${f.span}"` : ""}` });
    const s = cite(f);
    if (s) lines.push({ tone: "muted", text: s });
    lines.push({ tone: "muted", text: `    ${shortHash(f.evidence)}` });
  }

  for (const f of event.findings.filter((x) => x.outcome === "void")) {
    lines.push({ tone: "review", text: `  void       ${f.rule_id}` });
    lines.push({ tone: "muted", text: `    ${shortHash(f.evidence)}` });
  }

  const passed = event.findings.filter((f) => f.outcome === "pass").length;
  const notChecked = event.findings.filter((f) => f.outcome === "not_evaluable");
  const summary = [`${passed} rule(s) passed`];
  if (notChecked.length) summary.push(`${notChecked.length} not checked`);
  if (outOfScope.length) summary.push(`${outOfScope.length} not for this item`);
  lines.push({ tone: "muted", text: `  ${summary.join(" · ")}` });
  for (const f of notChecked) lines.push({ tone: "muted", text: `    not checked: ${f.rule_id} (${f.severity}): ${f.evidence}` });
  for (const n of notes) lines.push({ tone: "muted", text: `  · ${n}` });
  return lines;
}
