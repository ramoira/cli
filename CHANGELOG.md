# Changelog

## 0.5.0 — 2026-10-14

- **Spec 3.2.0.** `validate` reads 3.2.0 documents: what a rule protects, governed terms, pillar ids, affirmations; it refuses a 3.2.0 field in a document that declares an earlier version. 3.0.0 and 3.1.0 documents stay valid.
- **`init` installs `DRAFTING.md` 1.2.0.** Your agent writes spec 3.2.0 and drafts meaning first: facts and principles, the brand's own words, then rules saying what they protect, then voice and scope. A rule that protects nothing is listed for you to keep or delete.

## 0.4.0 — 2026-10-13

Brand schema spec 3.x (3.1.0) and drafting with your own coding agent. **Breaking:** works with ramoira.com's 3.x service only; 0.3.x and earlier talk to the retired v2 API, which now answers 410.

### What you get

- **`init`** sets your project up for your coding agent (Claude Code, Codex, GitHub Copilot, Cursor, Windsurf, JetBrains agents): it installs `ramoira/DRAFTING.md`, a local copy of the spec (`ramoira/spec/`) and `ramoira/README.md`, and adds a brand schema section to `AGENTS.md` (and `CLAUDE.md` or Copilot's instructions where they exist). Your agent drafts the schema; no account, no model key, no Ramoira model. `init --anchored` drafts from reference brands in your browser instead.
- **`hash`** prints the schema's fingerprint (`content_hash`); `--write` puts it in the file.
- **`validate`** checks full schemas, summaries, archetype templates and records against the spec's reference validator (schema validity, never conformance), and says what to do about a stale `content_hash`.
- **`check`** checks content against your schema's rules with the spec's open checker: free, no account; judged rules use your own Anthropic key, quote the item and cite the rule, or are void. Nothing suggests a rewrite. `--json` for CI.
- **`push`** uploads a private version for the owner's review on ramoira.com; nothing becomes public. Refused when based on an older reviewed version, or when it claims an affirmation the owner never made.
- **`pull`** brings down the version the owner reviewed, and their requests in `ramoira/REVIEW.md` when they sent it back.
- **`status`** shows the facts about a brand (published, ratified, checked; never a score) and where this project's file stands: the public version, waiting for review, changed, or behind a newer version.
- **`book`** renders a brand book from the schema without a model; `--probe` lets you judge sample lines (your own key).
- **`login`** signs in through the browser (GitHub or an emailed link) and retires this computer's earlier token; **`logout`** revokes it; **`create-token`** makes a token for CI (`RAMOIRA_TOKEN`), which can push and pull, never make a version public.
- `ramoira/sync.json` records the brand and the reviewed base, like a branch's upstream; the file's `workflow_state` follows the lifecycle (`draft`, `in_review`, `published`).

### Retired

- `publish`: only the owner makes a version public, signed in, in the review. The command says so and points to `push`.
- The `init` questionnaire that called a model with your own key, and the v2 generator.
- `certified` and `confidence`: there is no score anywhere.

### How it got here

The entries below record the steps of this release in order; some were replaced before it shipped (the questionnaire `init`, `publish` in 3.0.0).

#### Drafting with your own coding agent (roadmap D20)

- `init` installs `ramoira/DRAFTING.md` (the drafting protocol your agent follows), a local copy of the spec in `ramoira/spec/`, and `ramoira/README.md`, a page for the person: what the folder holds, draft → push → review → make public or send back → pull, changing a public schema (a new version, or **Revise** on the dashboard), what is public and what is private. It adds a brand schema section to `AGENTS.md` (and `CLAUDE.md`, Copilot's instructions where they exist). Run it again to refresh them; a `README.md` you wrote yourself is left alone. The questionnaire is retired; `init` calls no model.
- New `hash` (`--write` sets `content_hash`), `push` (a private version for the owner's review; refused when based on an older reviewed version) and `pull` (the reviewed version, and the owner's requests in `ramoira/REVIEW.md`). `ramoira/sync.json` records the brand and the base. `publish` is retired: only the owner makes a version public, signed in.
- `validate`, `hash` and `push` say when the project's `DRAFTING.md` is not the one this CLI ships.
- `status` also says where this project's file stands: the public version, waiting for review, changed since the last push, or behind a newer version the owner reviewed or made public (for example after **Revise**); signed in, it compares with the reviewed version too. The `AGENTS.md` section asks agents to run it before writing copy.
- `login` retires this computer's earlier token; `logout` revokes the token on the server.

#### 3.0.0 groundwork (roadmap P2)

- `publish` sends 3.0.0 full schemas to Ramoira's new service: the slug is `ramoira.brand_id`; publishing to an unclaimed slug claims it; the same version again changes nothing. 2.0.0 is refused with the migration guide. Server-side validation errors are listed.
- `login` waits for approval in the browser (GitHub or an emailed sign-in link), not only GitHub.
- `@ramoira/schema` pinned to a build whose validators are compiled ahead of time.
- New `check`: checks content items against your schema's rules with the spec's open checker (`@ramoira/schema/checker`, bundled). Free, no account. Exact and structural rules run without a model; judged rules use your own key and must quote the item and cite the rule's own examples, or they are void and the item needs review. Every finding names the rule and quotes the span; nothing suggests a rewrite. No option picks or skips rules. Results are tooling only; a candidate schema gives "Not certifiable". `--json` prints verdict events for CI; exit codes 0 pass, 1 fail, 2 needs review, 3 could not check.
- Removed a stale readme line about OpenAI-compatible providers: the CLI calls Anthropic models only.
- `validate` checks 3.0.0 full schemas, summaries, archetype templates, verdict records and adoption records, using the spec's reference validator (`@ramoira/schema`, bundled). Errors name the spec invariant behind them. It is described as schema validity, never conformance. 2.0.0 files are still checked, with a pointer to the migration guide. `--summary` is gone: the kind is detected.
- `status` shows facts, not a score: published, ratified, conformance checking, faithfulness, density. Fields the server does not report yet say so.
- `book` renders a 3.0.0 schema without calling a model: every line comes from the schema, and example copy only from examples the brand judged. The cover reads "Candidate — not ratified" until the brand ratifies.
- `book --probe`: a model (your own key) drafts sample lines as probes; you mark them "That's us", "Close" or "Not us" with a reason; marked lines become brand-judged examples in your schema, with the reactions kept as evidence.
- Removed: `book`'s model-written copy (sample lines "in the brand's actual voice" were Ramoira writing content), and the unused server-side book call.
- Requires Node.js 20.10 or later. Anthropic SDK updated; probes use `claude-opus-5-5` with server-side refusal fallbacks.
- `init` writes a complete five-layer 3.0.0 candidate (C1, C2). New questionnaire (who is answering; words never to use, claims, competitors, surfaces instead of the archetype tagline and three adjectives). Your model drafts the rest in a fixed shape, and the CLI assembles the schema: what you typed is `authored`; model-proposed rules are `inherited, affirmed: false`, which blocks ratification until the brand affirms them; brand facts are left `unfilled`, not invented. No model-written sample copy: judged rules are backed by sample lines you judge, or become guidance questions. `--no-probes` skips judging; `--anchored` is reserved for the hosted archetype drafting service (not available yet). Fast mode is gone.
- `agents.md` is built from the 3.0.0 public summary, so private rules stay out of a file that may be committed.
- `publish` refuses 3.0.0 schemas until the new service opens; 2.0.0 publishing is unchanged.
- Removed the v2 generator, including a worked example written about a real brand, and the unused `enrich` command code.

#### Earlier copy changes (P0)

- `init` preview is labelled "Candidate — not ratified"; personality scores are labelled as a diagnostic, not a quality or certification score
- `init` no longer suggests `ramoira enrich`, which is not available
- `status` no longer shows `certified` or `confidence` (both deprecated in the spec ahead of 3.0.0)
- `publish` states that publishing does not ratify the schema, and no longer mentions certification
- README: tier table replaced; `book` documented as running with no account

---

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
