# Ramoira — Cross-Repo Roadmap

> Platform v2.0.0 is ground truth. brand-schema-spec and docs align to it. CLI follows after.

**Last updated:** 2026-04-21  
**Status:** Active

---

## Ground Truth Decision

The platform's component architecture (`lib/brand-schema/`) is the canonical schema definition. `brand-schema-spec` and `docs` will be rewritten to match it. The v1.0 SPEC.md is superseded.

What this means in practice:

- SPEC.md is rewritten from scratch to describe v2.0.0
- SPEC.schema.json is rebuilt to validate the v2.0.0 structure
- Docs field references update to v2.0.0 names
- CLI work begins only after spec and docs are stable

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

**Summary schema contains (free published tier):**
- `identity`: prism.relationship (mode/formality/warmth), distinctiveAssets.linguistic.ownedWords + typographicVoice.sentenceStructure, summary (oneLineBrief, threeAdjectives, neverDo)
- `narrative`: semiotic (denotative + connotative), myth (mythStatement + mythTest + constraints), contentTest
- `voice`: base (sentenceLength, vocabularyLevel, humourPermitted, humourStyle), approvedTones, forbiddenTones, examples (min 2 approved + 2 rejected with reasons), base.structuralRules

**Studio adds to public summary:**
- `identity.distinctiveAssets.linguistic.typographicVoice` (full — sentenceStructure, punctuationStyle, numeralStyle)
- `narrative.semiotic.connotative.minimumConnotativeTest`
- `voice.contextVariants` (surface-specific voice deltas)
- `governance.compliance.zeroToleranceTerms` (public safety signal)

---

## Repo Responsibilities

| Repo | Owns | Status |
|:---|:---|:---|
| `platform` | Ground truth schema types, archetype library, generation runtime | Complete through Phase 5 |
| `brand-schema-spec` | Open standard — SPEC.md, JSON validators, blank templates, examples | Needs full rewrite to v2.0.0 |
| `docs` | User-facing guides, field reference, integration docs | Needs update to v2.0.0 |
| `cli` | `init`, `publish`, `studio`, `validate`, `status` | Deferred — begins after spec + docs stable |

---

## Phase 1 — Rewrite brand-schema-spec to v2.0.0

**Goal:** The open standard reflects what the platform actually implements. Rolex schema is the reference implementation.

### 1.1 — Rewrite SPEC.md

Replace the v1.0 flat-field documentation with the v2.0.0 component architecture. Sections to cover:

**Ground truth sources** (read these, don't invent):
- `platform/lib/brand-schema/components/` — all 5 component type definitions
- `platform/lib/brand-schema/types.ts` — OutputSurface (17), UserIntent (8), ConstraintSeverity, FallbackBehaviour, Constrained<T>, Rail
- `platform/lib/brand-schema/rolex/schema.v2.ts` — reference implementation

**Content to document:**

- **Identity component** — Kapferer Prism (physique, personality, culture, relationship, reflection, selfImage) + Aaker scores + Distinctive Assets (visual/sonic/linguistic) + summary
  - RelationshipMode enum (8 values: peer, kind_friend, coach, mentor, servant_to_exceptional, fellow_activist, entertainer, challenger)
  - Constrained<T> usage rule: use when severity level changes how a generation pipeline responds; plain strings otherwise
- **Narrative component** — Semiotic (denotative + connotative + layerHierarchy) + Myth + MythEvolution + Pillars + Editorial + ContentTest
  - Document the v1.0 → v2.0.0 field decompositions: positioning → categoryDescriptor + mythStatement; territory → meaningClusters; belief → culturalTension
- **Voice component** — base parameters + approvedTones + forbiddenTones + examples (approved + rejected) + contextVariants + rails (global + alternatives)
  - Document the v1.0 → v2.0.0 decompositions: register → prism.relationship.{formality/warmth/mode} + base.{sentenceLength/vocabularyLevel}; contrast → distributed across examples/structuralRules/typographicVoice/minimumConnotativeTest
- **Commercial component** — PricingRules + ClaimsRegistry + OfferRules + SocialProofRules + surfaceRules + globalForbiddenTerms
  - Document v1.0 → v2.0.0: tier → pricing.style + pricing flags; differentiator → mythStatement + categoryDescriptor + identity.summary.oneLineBrief
- **Governance component** — SeverityRegistry + ConflictResolution + surfaceRules (with intentRules) + overrideProtocol + compliance + preflight
  - Document v1.0 → v2.0.0: never → severity.absolute.constraints + compliance.zeroToleranceTerms
- **OutputSurface enum** (17 values — canonical source: `platform/lib/brand-schema/types.ts`)
- **UserIntent enum** (8 values)
- **Meta block** — brandId, brandName, schemaVersion, effectiveDate, previousVersion, changelog — plus the 4 fields to be added: certified, confidence, canonical_url, owner_verified
- **Schema lifecycle** — local → published → certified, mapped to workflowState in BrandSpecVersionRecord
- **Tier model** — how brand market tier encodes into pricing.style + pricing flags

**File:** `brand-schema-spec/SPEC.md`

### 1.2 — Rebuild SPEC.schema.json

Replace the current JSON Schema with one that validates the v2.0.0 component structure. Priority constraints to enforce:

- Required top-level keys: `meta`, `identity`, `narrative`, `voice`, `commercial`, `governance`
- `_component` constant on each component (`"identity"`, `"narrative"`, etc.)
- `_version` string on each component
- `RelationshipMode` enum (8 values) on `identity.prism.relationship.mode`
- `PricingStyle` enum (5 values) on `commercial.pricing.style`
- `ConstraintSeverity` enum (`absolute | strong | contextual`) on all Constrained fields
- `FallbackBehaviour` enum (4 values) on governance surfaceRules
- `OutputSurface` enum (17 values) on contextVariants[].surface, surfaceRules[].surface
- `SentenceLength` enum (`short | varied | long | fragments_permitted`) on voice.base.sentenceLength
- `HumourStyle` enum (6 values) on voice.base.humourStyle
- `VoiceExample.verdict` enum (`approved | rejected`)
- `layerHierarchy` enum (`connotative_first | balanced | denotative_first`)

**File:** `brand-schema-spec/SPEC.schema.json`

### 1.3 — Rebuild SPEC.summary.schema.json

Replace `additionalProperties: true` with a defined field selection policy. Required fields in the summary:

- `identity.summary` (oneLineBrief, threeAdjectives, neverDo)
- `identity.prism.relationship` (mode, formality, warmth)
- `identity.distinctiveAssets.linguistic.ownedWords`
- `narrative.semiotic` (denotative.categoryDescriptor, connotative.meaningClusters + emotionalRegister)
- `narrative.myth` (mythStatement, mythTest, constraints)
- `narrative.contentTest`
- `voice.base` (sentenceLength, vocabularyLevel, humourPermitted, humourStyle)
- `voice.approvedTones`, `voice.forbiddenTones`
- `voice.examples` — minimum 2 approved + 2 rejected (verdict + reason required)
- `voice.base.structuralRules`
- `meta` (brandId, brandName, schemaVersion, schemaType: "summary", canonicalURL, certified, confidence)

**File:** `brand-schema-spec/SPEC.summary.schema.json`

### 1.4 — Rewrite blank templates

Update both blank templates to v2.0.0 structure with empty/placeholder values. These are the starting point for `ramoira init`.

**Files:** `brand-schema-spec/schemas/brand.schema.json`, `brand-schema-spec/schemas/brand.schema.summary.json`

### 1.5 — Fix Little Rituals example

Already has good content depth. Needs:
- Add `_version: "2.0.0"` to all 5 components
- Update `meta` to v2.0.0 structure (add effectiveDate, previousVersion, changelog; move website/baseArchetype/archetypeDivergences/market into appropriate fields or drop)
- Add `governance.surfaceRules[].intentRules` (gap found vs. Rolex reference)
- Add `governance.compliance.geographicOverrides` if applicable
- Expand `contextVariants` to cover `paid_landing_page` and `product_detail_page` (referenced in pillars.surfaces but no variant defined)

**Files:** `brand-schema-spec/examples/little-rituals/brand.schema.json`, `brand-schema-spec/examples/little-rituals/brand.schema.summary.json`

### 1.6 — Rebuild YMB example

Not v2.0.0 compliant. Needs a full rebuild into the component architecture. Use platform archetype `coach` as the base template (YMB's archetype). Key gaps to fill:

- Wrap all prism fields under `identity.prism.*`
- Add `identity.distinctiveAssets` (visual, sonic, linguistic)
- Add `identity.summary`
- Wrap myth fields under `narrative.myth.*`
- Add `narrative.semiotic` (denotative is entirely absent)
- Add `narrative.mythEvolution`, `narrative.pillars`, `narrative.editorial`, `narrative.contentTest`
- Add `voice.base` wrapper; move structuralRules into it
- Rename `positiveRails` → `rails.global`; add `rails.alternatives`
- Add `voice.examples` (approved + rejected with verdicts)
- Add `voice.contextVariants`
- Add `commercial.pricing` wrapper; add `claims`, `socialProof`, `surfaceRules`
- Add entire `governance` component
- Remove `validationOutputs[]` — move to stress-test fixtures

**File:** `brand-schema-spec/examples/ymb/your-makeup-bar-brand-schema.json`

### 1.7 — Populate minimal example

Currently empty. Add the smallest valid v2.0.0 schema that passes SPEC.schema.json validation.

**Files:** `brand-schema-spec/examples/minimal/`

### 1.8 — Add llms.txt to each example

Each example directory should have an `llms.txt` describing how an LLM should load and use the schema.

---

## Phase 2 — Rewrite docs to v2.0.0

**Goal:** Every user-facing doc reflects v2.0.0 field names and structure. No v1.0 field names in docs after this phase.

### 2.1 — Rewrite schema-fields.md

Currently references v1.0 field names and points to platform files without listing the fields. Replace with:

- Field tables for all 5 components using v2.0.0 names
- Enum value lists for OutputSurface, UserIntent, RelationshipMode, PricingStyle, ConstraintSeverity, FallbackBehaviour
- Constrained<T> and Rail type documentation with the usage rule
- Full/Summary column marking which fields appear in each
- Source: `platform/lib/brand-schema/types.ts` and `components/*.ts`

**File:** `docs/reference/schema-fields.md`

### 2.2 — Rewrite tiers.md

Expand the current 14-line stub to cover:

- Three-tier model (Local / Published / Studio) with what each includes at the v2.0.0 field level
- How brand market tier encodes into `commercial.pricing.style` and pricing flags (not a separate field)
- Summary field selection policy — exactly which v2.0.0 fields are in the free summary
- What Studio adds (full contrast cluster: typographicVoice, minimumConnotativeTest, contextVariants, zeroToleranceTerms)
- Schema lifecycle: workflowState transitions (draft → in_review → published) and certified flag

**File:** `docs/concepts/tiers.md`

### 2.3 — Rewrite what-is-a-brand-schema.md

Currently describes v1.0. Rewrite to describe v2.0.0 — five components, component architecture, why each component exists (Kapferer for identity, Barthes for narrative, etc.).

**File:** `docs/concepts/what-is-a-brand-schema.md`

### 2.4 — Rewrite api.md

Replace internal-only endpoint list with Brand API reference:

- Public schema endpoints (GET — no auth)
- CLI-facing endpoints (POST — requires token)
- Governance webhook endpoints
- Auth model
- Schema for request/response bodies (reference platform Zod schemas)

**File:** `docs/reference/api.md`

### 2.5 — Expand publishing.md

Add v2.0.0-specific detail:

- What gets extracted into the summary (exact field list from Phase 1.3)
- What stays local (commercial + governance components; full contextVariants; full linguistic assets)
- What Studio unlocks in the public summary

**File:** `docs/guides/publishing.md`

### 2.6 — Update integration docs

Each integration doc currently describes schema loading in v1.0 terms. Update to v2.0.0:

- Reference `identity.summary.neverDo` and `voice.base.structuralRules` as the highest-priority agent load
- Reference the surface manifest (`platform/lib/brand-schema/surfaces/manifest.ts`) for surface-trimmed loading
- Update schema URL patterns

**Files:** `docs/integrations/claude-code.md`, `cursor.md`, `windsurf.md`, `lovable.md`, `v0.md`

---

## Phase 3 — Platform: Brand API + Metadata (platform)

**Goal:** Platform serves schemas with complete metadata blocks and exposes public Brand API endpoints. Unblocked by Phase 1 completion (needs stable SPEC.summary.schema.json for validation).

### 3.1 — Add missing metadata fields to BrandSpecVersionRecord

`BrandSpecVersionRecord` in `contracts.ts` is missing:
- `certified: boolean`
- `confidence: number` (0–1)
- `canonical_url: string | null`
- `owner_verified: boolean`

Add these fields and create the Prisma migration.

**Files:** `lib/brand-spec/contracts.ts`, `prisma/schema.prisma`

### 3.2 — Inject metadata block into served schema JSON

The publish API route should embed a `meta` block into the served summary schema JSON matching the SPEC.md metadata fields — drawn from `BrandSpecVersionRecord`.

**File:** `app/api/brand-spec/publish/route.ts`

### 3.3 — Public schema serving endpoints

```
GET  /brands/[slug]/schema.summary.json   → published or certified summary schema
GET  /brands/[slug]/status                → { workflowState, certified, confidence, canonical_url }
```

Edge-cacheable. No auth required.

**Files:** `app/api/brands/[slug]/schema.summary.json/route.ts` (new), `app/api/brands/[slug]/status/route.ts` (new)

### 3.4 — API token issuance

Users generate API tokens scoped to their brand from the dashboard.

**Files:** `app/dashboard/` updates, `app/api/tokens/route.ts` (new)

### 3.5 — Studio certification flow + governance webhooks

Studio endpoint, certification queue, governance violation/override webhooks. See original Phase 4–5 detail.

---

## Phase 4 — CLI (deferred)

CLI begins after Phase 1 and Phase 2 are stable. The CLI will build against the v2.0.0 SPEC.schema.json and SPEC.summary.schema.json as its validators, and against the blank templates in `brand-schema-spec/schemas/` as its generation targets.

Scope unchanged from original Phase 3 — implement `init`, `validate`, `publish`, `studio`, `status`, auth token management.

---

## Delivery Sequence

```
Phase 1 (brand-schema-spec rewrite)
  → 1.1 SPEC.md        → 1.2 SPEC.schema.json    → 1.3 SPEC.summary.schema.json
  → 1.4 blank templates → 1.5 Little Rituals fix   → 1.6 YMB rebuild
  → 1.7 minimal example

Phase 2 (docs rewrite) — can begin in parallel with Phase 1.1
  → 2.1 schema-fields.md  → 2.2 tiers.md  → 2.3 what-is-a-brand-schema.md
  → 2.4 api.md            → 2.5 publishing.md → 2.6 integration docs

Phase 3 (platform) — unblocked after Phase 1.3
  → 3.1 metadata fields → 3.2 metadata injection → 3.3 public endpoints
  → 3.4 API tokens → 3.5 Studio + webhooks

Phase 4 (CLI) — begins after Phase 1 + 2 complete
```

---

## Open Questions

| # | Question | Owner | Status |
|:---|:---|:---|:---|
| 1 | Studio certification: human-in-the-loop or fully automated for v1? | Product | Open |
| 2 | What's the price point for Studio? (Affects upsell copy in docs) | Product | Open |
| 3 | Does Published tier require account creation, or is publish anonymous? | Product | Open |
| 4 | Which v2.0.0 fields are in the free summary vs. Studio-only? (Phase 1.3 needs this decision to finalise SPEC.summary.schema.json) | Spec | Open |
| 5 | Are the 8 platform archetype names (monument, activist, peer, etc.) the canonical public names, or are the v1.0 names (the-aesthete, the-pioneer, etc.) still intended for the spec? | Spec | Open |
| 6 | Should brand slugs be globally unique on ramoira.com, or scoped to owner account? | Platform | Open |
| 7 | Does the governance webhook system require brands to register a URL, or is it Ramoira-hosted? | Platform | Open |

---

## Current State

| Repo | Status |
|:---|:---|
| `platform` | Ground truth. v2.0.0 component architecture complete. Rolex is reference implementation. Missing: `certified`, `confidence`, `canonical_url`, `owner_verified` in DB; Brand API routes not built. |
| `brand-schema-spec` | Describes v1.0. Incompatible with platform. Full rewrite required (Phase 1). |
| `docs` | Describes v1.0 field names. Needs update after Phase 1.1 is done (Phase 2). |
| `cli` | Empty scaffolding. Deferred until Phase 1 + 2 complete (Phase 4). |
