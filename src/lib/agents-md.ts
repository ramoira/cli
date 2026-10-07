import { extractSummary } from "./validator.js";

// ramoira/agents.md: a plain-language brief for the AI tools in the brand's
// project. Built from the public summary, not the full schema, because this
// file often ends up committed: private rules, and the commercial and
// governance layers, stay out unless the brand opted them in.

type Obj = Record<string, any>;

const surface = (s: string) => s.replace(/_/g, " ");

export function generateAgentsMd(full: Obj, canonicalUrl?: string): string {
  const s = extractSummary(full) as Obj;
  const name: string = full.draft_provenance?.intake?.name || s.ramoira.brand_id;
  const ratified = Boolean(s.ramoira.ratification);
  const lines: string[] = [];
  const push = (...xs: string[]) => lines.push(...xs);

  push(`# ${name} — brand context`, "");
  push(
    ratified
      ? "> This schema has a ratification pointer: the brand says it stands behind this version."
      : "> **Candidate — not ratified.** A draft of what this brand means. Treat it as guidance, not as the brand's approved measure.",
    "",
  );

  const myth = s.narrative?.myth?.mythStatement;
  if (myth) push(`**What we believe:** ${myth}`, "");
  push(`**What we make:** ${s.narrative.semiotic.denotative.categoryDescriptor}`, "");

  const rules: Obj[] = s.rules ?? [];
  if (rules.length) {
    push("## Rules", "", "Follow these exactly. Severity: absolute rules are never broken; strong rules need sign-off to break.", "");
    for (const sev of ["absolute", "strong", "contextual"]) {
      for (const r of rules.filter((x) => x.severity === sev)) {
        const terms = r.match?.terms?.length ? ` Terms: ${r.match.terms.map((t: string) => `"${t}"`).join(", ")}.` : "";
        const where = r.surfaces === "all" ? "" : ` (on: ${r.surfaces.map(surface).join(", ")})`;
        push(`- **${sev}** — ${r.statement}${terms}${where}`);
      }
    }
    push("");
  }

  const claims: Obj[] = s.narrative.semiotic.denotative.claims ?? [];
  if (claims.length) {
    push("## Claims you may make", "", "Only these. Do not invent or embellish product facts.", "");
    claims.forEach((c) => push(`- ${c.claim}`));
    push("");
  }

  push("## Voice", "");
  if (s.voice.approvedTones?.length) push(`**Sounds:** ${s.voice.approvedTones.join(", ")}`);
  const brief = s.identity?.prism?.personality?.characterBrief;
  if (brief) push(`**Character:** ${brief}`);
  push(`**Humour:** ${s.voice.base.humourStyle.style}${s.voice.base.humourStyle.frequency ? ` (${s.voice.base.humourStyle.frequency})` : ""}`);
  push("");

  const judged = (s.voice.examples ?? []).filter((e: Obj) => ["brand_owner", "brand_team"].includes(e.judged_by));
  if (judged.length) {
    push("## Examples the brand judged", "");
    for (const e of judged) push(`- ${e.verdict === "approved" ? "✓" : "✗"} *${surface(e.surface)}*: "${e.text}" — ${e.reason}`);
    push("");
  }

  const variants: Obj[] = s.voice.contextVariants ?? [];
  if (variants.length) {
    push("## By surface", "");
    for (const v of variants) {
      const bits = [v.openingInstruction, v.closingInstruction].filter(Boolean).join(" ");
      push(`- **${surface(v.surface)}**${bits ? `: ${bits}` : ""}`);
    }
    push("");
  }

  const guidance: Obj[] = s.narrative.guidance ?? [];
  if (guidance.length) {
    push("## Questions to ask of any draft", "");
    guidance.forEach((g) => push(`- ${g.question}`));
    push("");
  }

  push("---", "", `Source: \`ramoira/brand.schema.json\` (spec 3.0.0, ${s.ramoira.content_hash.slice(0, 19)}…)${canonicalUrl ? ` · Public summary: ${canonicalUrl}` : ""}`, "");
  return lines.join("\n");
}
