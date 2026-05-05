# Changelog

## 0.3.5 — 2026-05-05

### Features

- API key entered manually during `init` is now saved to `~/.ramoira/config.json` — `book`, `publish`, and other commands pick it up automatically without re-exporting

---

## 0.3.4 — 2026-05-05

### Features

- `init` now generates in fast mode by default (~20s vs ~40s) — required fields only; optional sections skipped
- Brand preview after `init` now shows personality scores (sincerity, excitement, competence, sophistication, ruggedness), cultural tension, approved vs rejected voice examples side-by-side, owned phrases, and a review checklist for agent-generated sections
- `ramoira enrich` command and context-gathering module built (URL + .txt/.md file ingestion, word-count limits, truncation warnings) — hidden pending platform component PATCH API

### Fixes

- Intake prompt messages shortened to prevent cursor misalignment on terminal line-wrap (inquirer cursor bug with long messages)
- MIT license added to `package.json` and `LICENSE` file populated

---

## 0.2.6 — 2026-04-30

### Features

- All commands now default to a `ramoira/` subdirectory — `init` writes `ramoira/brand.schema.json` and creates the folder automatically; `book` writes `ramoira/<brandId>-brand-book.html`
- `init` prints a brand preview (myth statement + first approved voice example) immediately after generation so output is visible before opening any file
- `init` now prints the absolute path of the saved schema file
- `book` HTML includes a "View schema" link in the footer pointing back to the source schema file
- Intake prompt improvements and streaming generator UX
- Organic growth hooks added to the brand book generator

### Fixes

- Schema JSON output is now fully ASCII-safe — all non-ASCII characters (em dashes, currency symbols, emoji) are Unicode-escaped, eliminating encoding display issues across terminals and editors
- `ownedPhrases` and `forbiddenWords` now fall back to `"strong"` severity (not `"contextual"`) when the LLM omits the field
- `permittedCompetitors: []` is removed when `competitorMentionPermitted: true` — an empty list with permission granted was a logical contradiction
- `repairConstrainedArray` default severity is now configurable per call site

---

## 0.1.0 — 2026-04-24

Initial release.

### Commands

- `ramoira init` — interactive brand schema generation via your own LLM key
- `ramoira validate` — local schema validation against Ramoira spec v2.0.0, CI-friendly
- `ramoira publish` — publish summary schema to ramoira.com (requires account)
- `ramoira status` — check publication state for a brand slug
- `ramoira login` / `logout` / `whoami` — token management

### Notes

- Schemas are validated against the bundled Ramoira spec v2.0.0
- Full schema never leaves your machine; only the summary is published
- `validate` has no network requirement — safe for offline/air-gapped CI
