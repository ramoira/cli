import { extractSummary } from "./summary.js";

export function generateAgentsMd(
  schema: unknown,
  canonicalUrl?: string,
): string {
  const s = extractSummary(schema);

  const brandName = s.meta.brandName || s.meta.brandId;
  const lines: string[] = [];

  lines.push(`# ${brandName} — Brand Context`);
  lines.push("");

  // Myth — the one-sentence brand truth
  if (s.narrative.mythStatement) {
    lines.push(`> ${s.narrative.mythStatement}`);
    lines.push("");
  }

  // Identity
  lines.push("## Identity");
  lines.push("");
  if (s.identity.summary.oneLineBrief) {
    lines.push(`**Brief:** ${s.identity.summary.oneLineBrief}`);
  }
  if (s.identity.summary.threeAdjectives?.length) {
    lines.push(`**Character:** ${s.identity.summary.threeAdjectives.join("  ·  ")}`);
  }
  if (s.identity.summary.neverDo?.length) {
    lines.push(`**Never:** ${s.identity.summary.neverDo.join(", ")}`);
  }
  if (s.identity.relationshipMode) {
    lines.push(`**Relationship mode:** ${s.identity.relationshipMode}`);
  }
  lines.push("");

  // Narrative
  lines.push("## Narrative");
  lines.push("");
  if (s.narrative.categoryDescriptor) {
    lines.push(`**Category:** ${s.narrative.categoryDescriptor}`);
  }
  if (s.narrative.emotionalRegister) {
    lines.push(`**Emotional register:** ${s.narrative.emotionalRegister}`);
  }
  if (s.narrative.meaningClusters?.length) {
    lines.push(`**Meaning clusters:** ${s.narrative.meaningClusters.join(", ")}`);
  }
  lines.push("");

  // Voice
  lines.push("## Voice");
  lines.push("");
  if (s.voice.approvedTones?.length) {
    lines.push(`**Approved tones:** ${s.voice.approvedTones.join(", ")}`);
  }
  if (s.voice.forbiddenTones?.length) {
    lines.push(`**Forbidden tones:** ${s.voice.forbiddenTones.join(", ")}`);
  }
  if (s.voice.structuralRules?.length) {
    lines.push("");
    lines.push("**Structural rules:**");
    s.voice.structuralRules.forEach((r) => lines.push(`- ${r}`));
  }
  lines.push("");

  const approved = s.voice.examples?.filter((e) => e.verdict === "approved").slice(0, 1);
  const rejected = s.voice.examples?.filter((e) => e.verdict === "rejected").slice(0, 1);

  if (approved?.length) {
    lines.push("### Write like this");
    lines.push("");
    approved.forEach((ex) => {
      if (ex.context) lines.push(`*${ex.context}*`);
      lines.push(`> ${ex.text}`);
      lines.push("");
    });
  }

  if (rejected?.length) {
    lines.push("### Not like this");
    lines.push("");
    rejected.forEach((ex) => {
      if (ex.context) lines.push(`*${ex.context}*`);
      lines.push(`> ${ex.text}`);
      if (ex.reason) lines.push(`*Why: ${ex.reason}*`);
      lines.push("");
    });
  }

  // Content tests
  lines.push("## Content Tests");
  lines.push("");
  lines.push("Before publishing content, ask:");
  lines.push("");
  if (s.narrative.mythTest) {
    lines.push(`- ${s.narrative.mythTest}`);
  }
  if (s.narrative.minimumConnotativeTest) {
    lines.push(`- ${s.narrative.minimumConnotativeTest}`);
  }
  lines.push("");

  // Source
  lines.push("---");
  lines.push("");
  if (canonicalUrl) {
    lines.push(`Brand schema (machine-readable): ${canonicalUrl}`);
  } else {
    lines.push("Run `ramoira publish` to get a live canonical URL for agent consumption.");
  }
  lines.push("Full schema: `ramoira/brand.schema.json`");
  lines.push("");

  return lines.join("\n");
}
