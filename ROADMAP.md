# Ramoira — Cross-Repo Roadmap

> Platform v2.0.0 is ground truth. brand-schema-spec and docs align to it. CLI follows after.

**Last updated:** 2026-04-24
**Status:** Active — Phase 4 open-source features complete (4.4 Studio pending Ramoira Cloud release)

---

## Ground Truth Decision

The platform's component architecture (`lib/brand-schema/`) is the canonical schema definition. `brand-schema-spec` and `docs` are rewritten to match it. The v1.0 SPEC.md is superseded.

---

## Tier Model (v2.0.0 encoding)

| Tier | Status | What's public | Paid |
|:---|:---|:---|:---|
| **Local** | `local` (workflowState: draft) | Nothing | No |
| **Published** | `published` (workflowState: published) | Summary schema at `ramoira.com/brands/[slug]/schema.summary.json` | No |
| **Studio** | `certified` | Upgraded summary + full contrast cluster exposed | Yes |

**v2.0.0 tier encoding in schema:**
- Brand market tier (mass/mid/premium/luxury) → `commercial.pricing.style` (`opaque`=luxury, `transparent`=premium, `anchored`/`value_led`=mid/mass) plus `discountPermitted`, `priceDisplayPermitted`
- Publication tier (local/published/certified) → `workflowState` in `BrandSpecVersionRecord`

Full field-level detail: [brand-schema-spec/ROADMAP.md](../brand-schema-spec/ROADMAP.md)

---

## Repo Responsibilities

| Repo | Owns | Roadmap | Status |
|:---|:---|:---|:---|
| `platform` | Ground truth schema types, archetype library, generation runtime | [platform/ROADMAP.md](../platform/ROADMAP.md) | Complete through Phase 5 |
| `brand-schema-spec` | Open standard — SPEC.md, JSON validators, blank templates, examples | [brand-schema-spec/ROADMAP.md](../brand-schema-spec/ROADMAP.md) | Phase 1 complete (1.1–1.7 done) |
| `docs` | User-facing guides, field reference, integration docs | [docs/ROADMAP.md](../docs/ROADMAP.md) | Phase 2 complete (2.1–2.6 done) |
| `cli` | `init`, `publish`, `studio`, `validate`, `status` | This file | Phase 4 open-source complete (4.4 studio pending Ramoira Cloud) |

---

## Delivery Sequence

```
Phase 1 (brand-schema-spec) ✅ complete (1.1–1.7 done)
  → see brand-schema-spec/ROADMAP.md

Phase 2 (docs) ✅ complete (2.1–2.6 done)
  → see docs/ROADMAP.md

Phase 3 (platform) ✅ R1–R13 complete → see platform/ROADMAP.md

Phase 4 (CLI) ✅ complete
  ✅ 4.1 init
  ✅ 4.2 validate
  ✅ 4.3 publish
  ⬜ 4.4 studio  ← coming soon via Ramoira Cloud (Enterprise)
  ✅ 4.5 status
  ✅ 4.6 auth token management
  ⬜ 4.7 enrich  ← pending platform component PATCH API

Phase 5 (Schema Governance & Validation) ⬜ planned
  ⬜ 5.1 Schema versioning
  ⬜ 5.2 Output examples as schema tests
  ⬜ 5.3 CI and pre-commit integration
  ⬜ 5.4 Governance: ownership and change audit
```

---

## Phase 4 — CLI

Builds against:
- `brand-schema-spec/SPEC.schema.json` and `SPEC.summary.schema.json` as validators
- `brand-schema-spec/schemas/` blank templates as generation targets
- Platform Brand API endpoints (Phase 3) for publish/status

---

### 4.1 — `ramoira init`

Generates a `brand.schema.json` locally. No platform account required. No Ramoira API call.

**Flow:**
1. Terminal Q&A — questions map directly to schema fields (not archetype delta zones)
2. User provides their own LLM key (`ANTHROPIC_API_KEY` or OpenAI-compatible, read from env or prompted)
3. CLI calls the LLM directly with answers + schema generation prompt
4. LLM returns a populated schema JSON
5. CLI validates output against `brand-schema-spec/SPEC.schema.json`
6. Writes `brand.schema.json` to current directory

**Q&A fields covered (minimum viable for a valid schema):**

| Question | Schema field |
| :--- | :--- |
| What does your brand make or do? | `narrative.semiotic.denotative.categoryDescriptor` |
| One sentence — what does your brand stand for? | `narrative.myth.mythStatement` |
| Three words it should always feel like | `identity.summary.threeAdjectives` |
| How does your brand relate to customers? (show 8 options) | `identity.prism.relationship.mode` |
| What tones are always on-brand? | `voice.approvedTones` |
| What tones are always off-brand? | `voice.forbiddenTones` |
| Five things your brand must never do | `identity.summary.neverDo` |
| What is your brand's pricing approach? (show 5 options) | `commercial.pricing.style` |

Remaining required fields (voice examples, contentTest, governance.preflight, etc.) are LLM-synthesised from the answers above.

**CLI bundles:**
- Question set (field-mapped, defined in CLI package)
- Schema generation prompt template
- Thin Anthropic + OpenAI-compatible client
- `SPEC.schema.json` validator (copied from brand-schema-spec at build time)

**What init does NOT do:**
- Call the Ramoira platform
- Assign a confidence score
- Certify the schema
- Require an account

---

### 4.2 — `ramoira validate`

Validates a local `brand.schema.json` against `SPEC.schema.json`. No platform call.

```
ramoira validate [file]        # defaults to brand.schema.json in cwd
ramoira validate --summary     # validate against SPEC.summary.schema.json instead
```

Reports missing required fields, invalid enum values, and constraint violations. Exit code 1 on failure (CI-friendly).

---

### 4.3 — `ramoira publish`

Publishes a local `brand.schema.json` to the Ramoira platform. Requires an account and API token.

```
ramoira publish [file]
```

1. Validates locally first (same as `ramoira validate`)
2. Authenticates with API token (`RAMOIRA_TOKEN` env or `~/.ramoira/config`)
3. POSTs schema to platform (`/api/brands/[slug]/publish`)
4. Platform stores as a new draft version, extracts summary, serves at `ramoira.com/brands/[slug]/schema.summary.json`
5. CLI prints the public URL

---

### 4.4 — `ramoira studio`

Submits a published schema for Studio certification. Requires a paid Studio account.

*Note: Studio certification is a Ramoira Cloud (Enterprise) feature. This command will be available in a future release once the Cloud API is open.*

```
ramoira studio
```

1. Platform runs archetype alignment analysis (embeddings + PCA/UMAP)
2. Returns `confidence` score (0–1)
3. If above threshold → `certified: true`, Studio fields unlocked in public summary
4. CLI prints confidence score and certification status

Studio is the only command that uses the archetype system. The archetypes are Ramoira's certification engine, not a generation tool.

---

### 4.5 — `ramoira status`

Shows the current state of the brand on the platform.

```
ramoira status
```

Calls `GET /brands/[slug]/status` → prints `workflowState`, `certified`, `confidence`, `canonicalUrl`.

---

### 4.7 — `ramoira enrich`

Enriches an existing schema with optional sections (voice context variants, narrative pillars, editorial rules, full governance, commercial offer rules) informed by real brand content.

**Blocked on:** Platform component PATCH API — enrich needs to patch individual schema sections server-side rather than rewriting the full local file, so the platform is the source of truth and enrichment passes are independently tracked.

**Groundwork done:**
- `enrichSchema()` generator function built in `generator.ts`
- `context.ts` module for ingesting URLs (homepage + /about + /pricing, 1500 words/page) and .txt/.md files (2000 words), with word-count limits and truncation warnings
- `commands/enrich.ts` with `--url` and `--context` flags (repeatable), multi-pass guidance when total exceeds 5000 words
- Command registered but hidden in `index.ts` until platform API is ready

**Planned usage:**
```
ramoira enrich --url https://yourbrand.com
ramoira enrich --context brand-guidelines.md
ramoira enrich --url https://yourbrand.com --context pricing-brief.txt
```

---

### 4.6 — Auth token management

```
ramoira login     # opens browser or prompts for token, saves to ~/.ramoira/config
ramoira logout    # removes saved token
ramoira whoami    # prints current authenticated brand slug
```

---

## Phase 5 — Schema Governance & Validation

> Sourced from early community feedback: the schema/contract approach only holds long-term if versioning, examples, and change validation are first-class.

---

### 5.1 — Schema versioning

Every publish creates an immutable version record. Campaigns and generated assets can reference a pinned schema version (`brand.schema.json@v3`) so drift is traceable — not silent.

**CLI surface:**
```
ramoira publish              # creates v4, sets as latest
ramoira publish --pin        # publish and pin current ref to vN in local config
ramoira status --history     # list all published versions with timestamps
```

**What this enables:**
- Post-mortem: "this campaign used schema v3, here's what changed in v4"
- Rollback if a schema edit degrades output quality
- Multi-team environments where schema owner ≠ content producer

---

### 5.2 — Output examples as schema tests

A schema is a contract. Contracts need tests. Each schema rule (especially `neverDo`, `forbiddenTones`, `structuralRules`) should carry at least one passing and one failing output example.

**Schema addition:**
```json
"identity.summary.neverDo": [
  {
    "rule": "Never use urgency language",
    "passingExample": "Take your time — we'll be here.",
    "failingExample": "Limited time only. Act now."
  }
]
```

**CLI surface:**
```
ramoira test [file]          # runs LLM-evaluated assertions against passing/failing examples
ramoira test --rule neverDo  # test a specific rule cluster
```

Exit code 1 on failures — CI-compatible. This turns the schema from a style doc into something closer to a test suite for generated content.

---

### 5.3 — CI and pre-commit integration

`ramoira validate` already exits 1 on failure. The missing piece is first-class hook config so teams don't have to wire it up themselves.

**Deliverables:**
- `.pre-commit-hooks.yaml` config for pre-commit framework
- GitHub Actions workflow snippet in docs (`validate` on PR, `test` on merge to main)
- `ramoira validate --ci` flag: machine-readable output (JSON), no color, explicit exit codes

**Why:** A schema that lives in the repo but has no CI gate will drift. One quiet edit to `neverDo` silently breaks every downstream agent that reads it.

---

### 5.4 — Governance: ownership and change audit

Who owns schema updates? How do reviewers approve changes? These are not product concerns — they're the reason schemas drift in the first place.

**Additions to `brand.schema.json`:**
- `governance.owners` — list of identifiers (email, GitHub handle) who can approve changes
- `governance.changePolicy` — `"any-owner"` | `"all-owners"` | `"external-review"`
- `governance.changelog` — array of version records with author, timestamp, and summary of what changed

**CLI surface:**
```
ramoira diff [v2] [v3]       # human-readable diff between two published schema versions
ramoira governance check     # validates that current schema matches governance policy
```

**Open question:** Does governance enforcement live in the CLI (honour system) or the platform (enforced on publish)?

---

## Open Questions

| # | Question | Owner | Status |
|:---|:---|:---|:---|
| 1 | Studio certification: human-in-the-loop or fully automated for v1? | Product | Open |
| 2 | What's the price point for Studio? (Affects upsell copy in docs) | Product | Open |
| 3 | Does Published tier require account creation, or is publish anonymous? | Product | Open |
| 4 | Which v2.0.0 fields are in the free summary vs. Studio-only? | Spec | **Resolved** — see tier model above |
| 5 | Are the 8 platform archetype names the canonical public names? | Spec | Open |
| 6 | Should brand slugs be globally unique on ramoira.com, or scoped to owner account? | Platform | Open |
| 7 | Does the governance webhook system require brands to register a URL, or is it Ramoira-hosted? | Platform | Open |

---

## Current State

| Repo | Status |
|:---|:---|
| `platform` | Ground truth. v2.0.0 complete through Phase 5. Missing: `certified`, `confidence`, `canonical_url`, `owner_verified` in DB; Brand API routes not built. |
| `brand-schema-spec` | Complete. SPEC.md, validators, blank templates, Little Rituals, minimal, and Rolex examples all updated to v2.0.0. llms.txt in each example. |
| `docs` | Complete. schema-fields.md, tiers.md, what-is-a-brand-schema.md, api.md, publishing.md, and all 5 integration docs rewritten for v2.0.0. |
| `cli` | Phase 4 open-source complete. init, validate, publish, status, login, logout, whoami all implemented. studio (4.4) pending Ramoira Cloud release. |
