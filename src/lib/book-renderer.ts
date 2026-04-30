import type { ArchetypeTheme } from "./book-archetypes.js";

// ── Content slots ─────────────────────────────────────────────────────────────
// Produced by the LLM generator and injected into the HTML template.

export interface BookContent {
  brandName: string;
  oneLiner: string;
  effectiveDate: string;

  // Chapter 1 — Myth
  mythNarrative: string;          // 2–3 sentence human myth story
  mythTest: string;               // the content test question, plain language

  // Chapter 2 — Identity
  customerPortrait: string;       // 2–3 sentence character portrait
  threeAdjectives: string[];
  neverDo: string[];

  // Chapter 3 — Voice
  voiceCharacter: string;         // 1 paragraph describing the voice
  approvedTones: string[];
  forbiddenTones: string[];
  examples: Array<{
    surface: string;
    text: string;
    verdict: "approved" | "rejected";
    reason: string;
  }>;

  // Chapter 4 — Pillars
  pillars: Array<{
    name: string;
    claim: string;
    description: string;
  }>;

  // Chapter 5 — Rules
  absoluteConstraints: string[];
  strongConstraints: string[];
  preflight: string[];

  // Chapter 6 — Scenarios
  scenarios: Array<{
    surface: string;
    instruction: string;
    copy: string;
    note: string;
  }>;
}

// ── CSS variable block ────────────────────────────────────────────────────────

function renderCssVars(css: Record<string, string>): string {
  return Object.entries(css)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
}

// ── Section helpers ───────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTagList(items: string[]): string {
  return items
    .map((t) => `<span class="tag">${escHtml(t)}</span>`)
    .join("");
}

function renderExamples(
  examples: BookContent["examples"],
): string {
  return examples
    .map((ex) => {
      const cls = ex.verdict === "approved" ? "example-yes" : "example-no";
      const surface = ex.surface.replace(/_/g, " ");
      return `
      <div class="example-pair">
        <div class="example-surface">${escHtml(surface)}</div>
        <div class="example ${cls}">${escHtml(ex.text)}</div>
        <div class="example-why">${escHtml(ex.reason)}</div>
      </div>`;
    })
    .join("");
}

function renderPillars(pillars: BookContent["pillars"]): string {
  return pillars
    .map(
      (p, i) => `
      <div class="pillar">
        <div class="pillar-head">
          <span class="pillar-num">${i + 1}</span>
          <span class="pillar-name">${escHtml(p.name)}</span>
        </div>
        <div class="pillar-body">
          <div class="pillar-claim">${escHtml(p.claim)}</div>
          <div class="pillar-desc">${escHtml(p.description)}</div>
        </div>
      </div>`,
    )
    .join("");
}

function renderConstraintList(items: string[], cls: "rule-yes" | "rule-no"): string {
  return items
    .map((c) => `<div class="rule-item ${cls}">${escHtml(c)}</div>`)
    .join("");
}

function renderHardLines(items: string[]): string {
  return items
    .map(
      (c) => `
      <div class="hard-line">
        <span class="hard-line-icon">✕</span>
        <span class="hard-line-text">${escHtml(c)}</span>
      </div>`,
    )
    .join("");
}

function renderPreflight(items: string[]): string {
  return items
    .map(
      (q) => `
      <div class="rule-item rule-yes">
        <span style="font-weight:500">Before generating:</span> ${escHtml(q)}
      </div>`,
    )
    .join("");
}

function renderScenarios(scenarios: BookContent["scenarios"]): string {
  return scenarios
    .map((s) => {
      const surface = s.surface.replace(/_/g, " ");
      return `
      <div class="scenario">
        <div class="scenario-header">
          <span>${escHtml(surface)}</span>
          <span class="scenario-surface">${escHtml(s.instruction)}</span>
        </div>
        <div class="scenario-body">
          <div class="scenario-copy">${escHtml(s.copy)}</div>
          <div class="scenario-note">${escHtml(s.note)}</div>
        </div>
      </div>`;
    })
    .join("");
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderBrandBook(
  content: BookContent,
  theme: ArchetypeTheme,
): string {
  const cssVars = renderCssVars(theme.css);
  const { labels } = theme;

  const approvedExamples = content.examples.filter((e) => e.verdict === "approved");
  const rejectedExamples = content.examples.filter((e) => e.verdict === "rejected");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(content.brandName)} — Brand Book</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${theme.fontsUrl}" rel="stylesheet">
<style>
:root {
${cssVars}
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; }

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  font-weight: 300;
  line-height: 1.7;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

@media print {
  body { background: white; }
  .cover { min-height: auto; padding: 60px; }
  .chapter { break-inside: avoid; }
  .example-pair { break-inside: avoid; }
  .pillar { break-inside: avoid; }
}

/* ── COVER ── */
.cover {
  min-height: 100vh;
  background: var(--cover-bg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 72px 80px 64px;
  position: relative;
  overflow: hidden;
}

.cover::before {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 480px; height: 480px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  transform: translate(30%, -30%);
}

.cover-rule {
  width: 48px;
  height: 2px;
  background: var(--accent);
  margin-bottom: 32px;
}

.cover-brand {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 28px;
}

.cover-title {
  font-family: var(--font-serif);
  font-size: clamp(52px, 8vw, 88px);
  font-weight: 400;
  line-height: 0.95;
  color: var(--cover-text);
  max-width: 640px;
  position: relative;
  z-index: 1;
}

.cover-bottom {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 24px;
}

.cover-sub {
  font-size: 14px;
  color: var(--cover-sub);
  line-height: 1.6;
  max-width: 400px;
}

.cover-meta { text-align: right; }

.cover-meta-line {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--cover-sub);
  display: block;
  opacity: 0.7;
}

/* ── WRAPPER ── */
.doc {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 48px 120px;
}

/* ── CHAPTERS ── */
.chapter {
  padding: 72px 0 0;
  border-top: 2px solid var(--rule);
  margin-top: 72px;
}

.chapter:first-of-type {
  border-top: none;
  margin-top: 0;
  padding-top: 80px;
}

.chapter-number {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 16px;
}

.chapter-title {
  font-family: var(--font-serif);
  font-size: clamp(32px, 5vw, 50px);
  font-weight: 400;
  line-height: 1.05;
  color: var(--ink);
  margin-bottom: 32px;
}

.chapter-lead {
  font-family: var(--font-serif);
  font-size: 19px;
  line-height: 1.65;
  color: var(--ink-mid);
  max-width: 680px;
  margin-bottom: 40px;
  border-left: 3px solid var(--accent);
  padding-left: 24px;
  font-style: italic;
}

/* ── SECTIONS ── */
.section { margin-bottom: 52px; }

.section-title {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  color: var(--ink);
  margin-bottom: 16px;
}

.body-text {
  font-size: 15px;
  line-height: 1.75;
  color: var(--ink-mid);
  margin-bottom: 16px;
  max-width: 680px;
}

/* ── STORY BLOCK ── */
.story {
  background: var(--cover-bg);
  border-radius: 4px;
  padding: 48px 56px;
  margin: 40px 0;
  position: relative;
  overflow: hidden;
}

.story::before {
  content: '\\201C';
  font-family: var(--font-serif);
  font-size: 200px;
  color: rgba(255,255,255,0.06);
  position: absolute;
  top: -20px; left: 24px;
  line-height: 1;
  pointer-events: none;
}

.story-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.story-text {
  font-family: var(--font-serif);
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 400;
  font-style: italic;
  color: var(--cover-text);
  line-height: 1.45;
  position: relative;
  z-index: 1;
}

/* ── PORTRAIT ── */
.portrait {
  background: var(--surface-alt);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 32px 36px;
  margin: 32px 0;
}

.portrait-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-deep);
  margin-bottom: 16px;
}

.portrait-text {
  font-family: var(--font-serif);
  font-size: 18px;
  line-height: 1.6;
  color: var(--ink);
  font-style: italic;
}

/* ── TAGS ── */
.tag-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 24px; }

.tag {
  background: var(--surface-alt);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--ink-mid);
}

/* ── RULES GRID ── */
.rules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 24px 0;
}

@media (max-width: 600px) { .rules-grid { grid-template-columns: 1fr; } }

.rule-col-title {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-yes { background: var(--pass-text); }
.dot-no  { background: var(--fail-text); }
.rule-col-title.yes { color: var(--pass-text); }
.rule-col-title.no  { color: var(--fail-text); }

.rule-item {
  padding: 14px 16px;
  border-radius: 3px;
  font-size: 13px;
  line-height: 1.55;
  margin-bottom: 8px;
}

.rule-yes {
  background: var(--pass-bg);
  border: 1px solid var(--pass-border);
  color: var(--pass-text);
}

.rule-no {
  background: var(--fail-bg);
  border: 1px solid var(--fail-border);
  color: var(--fail-text);
}

/* ── EXAMPLES ── */
.example-section-header {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 32px 0 16px;
}

.example-pair { margin: 20px 0; }

.example-surface {
  display: inline-block;
  background: var(--surface-alt);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mid);
  margin-bottom: 10px;
}

.example {
  padding: 18px 20px 18px 44px;
  border-radius: 3px;
  font-family: var(--font-serif);
  font-size: 17px;
  font-style: italic;
  line-height: 1.55;
  margin-bottom: 6px;
  position: relative;
}

.example::before {
  position: absolute;
  left: 16px;
  top: 18px;
  font-size: 16px;
  font-style: normal;
}

.example-yes {
  background: var(--pass-bg);
  border: 1px solid var(--pass-border);
  color: var(--pass-text);
}

.example-yes::before { content: '✓'; color: var(--pass-text); }

.example-no {
  background: var(--fail-bg);
  border: 1px solid var(--fail-border);
  color: var(--fail-text);
}

.example-no::before { content: '✕'; color: var(--fail-text); }

.example-why {
  font-size: 12px;
  color: var(--ink-faint);
  padding-left: 44px;
  margin-bottom: 16px;
  line-height: 1.5;
}

/* ── PILLARS ── */
.pillars { display: grid; gap: 16px; margin: 24px 0; }

.pillar { border: 1px solid var(--rule); border-radius: 4px; overflow: hidden; }

.pillar-head {
  background: var(--surface-alt);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.pillar-num {
  font-family: var(--font-serif);
  font-size: 30px;
  color: var(--accent);
  line-height: 1;
  flex-shrink: 0;
}

.pillar-name {
  font-family: var(--font-serif);
  font-size: 19px;
  color: var(--ink);
}

.pillar-body { padding: 20px; background: var(--surface); }

.pillar-claim {
  font-family: var(--font-serif);
  font-size: 16px;
  font-style: italic;
  color: var(--ink-mid);
  margin-bottom: 10px;
  line-height: 1.5;
}

.pillar-desc { font-size: 13px; color: var(--ink-faint); line-height: 1.6; }

/* ── HARD LINES ── */
.hard-lines { margin: 28px 0; }

.hard-line {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 18px;
  border-bottom: 1px solid var(--fail-border);
  background: var(--fail-bg);
}

.hard-line:first-child { border-radius: 3px 3px 0 0; }
.hard-line:last-child { border-bottom: none; border-radius: 0 0 3px 3px; }

.hard-line-icon { font-size: 14px; color: var(--fail-text); margin-top: 1px; flex-shrink: 0; }
.hard-line-text { font-size: 13px; line-height: 1.55; color: var(--fail-text); }

/* ── SCENARIOS ── */
.scenario {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 4px;
  margin: 20px 0;
  overflow: hidden;
}

.scenario-header {
  padding: 12px 20px;
  background: var(--surface-alt);
  border-bottom: 1px solid var(--rule);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mid);
  display: flex;
  gap: 12px;
  align-items: center;
}

.scenario-surface { color: var(--accent-deep); }

.scenario-body { padding: 20px; }

.scenario-copy {
  font-family: var(--font-serif);
  font-size: 17px;
  font-style: italic;
  color: var(--ink);
  line-height: 1.6;
  margin-bottom: 10px;
}

.scenario-note { font-size: 12px; color: var(--ink-faint); line-height: 1.5; }

/* ── CLOSING ── */
.closing {
  background: var(--cover-bg);
  padding: 64px 80px;
  margin-top: 80px;
}

.closing-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
}

.closing-text {
  font-family: var(--font-serif);
  font-size: clamp(24px, 4vw, 38px);
  font-weight: 400;
  line-height: 1.2;
  color: var(--cover-text);
  max-width: 560px;
  font-style: italic;
}

/* ── DIVIDER ── */
hr.divider { border: none; border-top: 1px solid var(--rule); margin: 40px 0; }

</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div>
    <div class="cover-rule"></div>
    <div class="cover-brand">${escHtml(content.brandName)}</div>
    <div class="cover-title">Brand<br>Book</div>
  </div>
  <div class="cover-bottom">
    <div class="cover-sub">${escHtml(content.oneLiner)}</div>
    <div class="cover-meta">
      <span class="cover-meta-line">${escHtml(content.effectiveDate)}</span>
      <span class="cover-meta-line">Confidential</span>
    </div>
  </div>
</div>

<!-- DOCUMENT -->
<div class="doc">

  <!-- CHAPTER 1: MYTH -->
  <div class="chapter">
    <div class="chapter-number">01</div>
    <h2 class="chapter-title">${escHtml(labels.chapterMythTitle)}</h2>
    <div class="chapter-lead">${escHtml(content.mythNarrative)}</div>

    <div class="story">
      <div class="story-label">${escHtml(labels.storyLabel)}</div>
      <div class="story-text">${escHtml(content.mythTest)}</div>
    </div>
  </div>

  <!-- CHAPTER 2: IDENTITY -->
  <div class="chapter">
    <div class="chapter-number">02</div>
    <h2 class="chapter-title">${escHtml(labels.chapterIdentityTitle)}</h2>

    <div class="portrait">
      <div class="portrait-label">${escHtml(labels.portraitLabel)}</div>
      <div class="portrait-text">${escHtml(content.customerPortrait)}</div>
    </div>

    <div class="section">
      <div class="section-title">Three words that must always be true</div>
      <div class="tag-list">${renderTagList(content.threeAdjectives)}</div>
    </div>

    <div class="section">
      <div class="section-title">What this brand will never be</div>
      <div class="hard-lines">${renderHardLines(content.neverDo)}</div>
    </div>
  </div>

  <!-- CHAPTER 3: VOICE -->
  <div class="chapter">
    <div class="chapter-number">03</div>
    <h2 class="chapter-title">${escHtml(labels.chapterVoiceTitle)}</h2>
    <div class="chapter-lead">${escHtml(content.voiceCharacter)}</div>

    <div class="section">
      <div class="rules-grid">
        <div>
          <div class="rule-col-title yes"><span class="dot dot-yes"></span>Sounds like</div>
          ${renderConstraintList(content.approvedTones, "rule-yes")}
        </div>
        <div>
          <div class="rule-col-title no"><span class="dot dot-no"></span>Never sounds like</div>
          ${renderConstraintList(content.forbiddenTones, "rule-no")}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="example-section-header">Approved</div>
      ${renderExamples(approvedExamples)}
      <div class="example-section-header" style="margin-top:28px">Rejected</div>
      ${renderExamples(rejectedExamples)}
    </div>
  </div>

  <!-- CHAPTER 4: PILLARS -->
  ${
    content.pillars.length > 0
      ? `
  <div class="chapter">
    <div class="chapter-number">04</div>
    <h2 class="chapter-title">${escHtml(labels.chapterPillarsTitle)}</h2>
    <div class="pillars">${renderPillars(content.pillars)}</div>
  </div>`
      : ""
  }

  <!-- CHAPTER 5: RULES -->
  <div class="chapter">
    <div class="chapter-number">${content.pillars.length > 0 ? "05" : "04"}</div>
    <h2 class="chapter-title">${escHtml(labels.chapterRulesTitle)}</h2>

    <div class="section">
      <div class="section-title">The hard lines</div>
      <p class="body-text">These are absolute. No exception, no override.</p>
      <div class="hard-lines">${renderHardLines(content.absoluteConstraints)}</div>
    </div>

    ${
      content.strongConstraints.length > 0
        ? `
    <div class="section">
      <div class="section-title">Needs sign-off</div>
      <p class="body-text">These require human review before publishing.</p>
      ${renderConstraintList(content.strongConstraints, "rule-no")}
    </div>`
        : ""
    }

    <div class="section">
      <div class="section-title">Before anything is written</div>
      ${renderPreflight(content.preflight)}
    </div>
  </div>

  <!-- CHAPTER 6: SCENARIOS -->
  <div class="chapter">
    <div class="chapter-number">${content.pillars.length > 0 ? "06" : "05"}</div>
    <h2 class="chapter-title">${escHtml(labels.chapterScenariosTitle)}</h2>
    ${renderScenarios(content.scenarios)}
  </div>

</div>

<!-- CLOSING -->
<div class="closing">
  <div class="closing-label">${escHtml(content.brandName)}</div>
  <div class="closing-text">${escHtml(labels.closingStatement)}</div>
</div>

</body>
</html>`;
}
