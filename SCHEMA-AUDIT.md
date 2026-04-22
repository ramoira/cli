# Schema Consistency Audit + Free Tier Opportunities

**Date:** 2026-04-21  
**Scope:** brand-schema-spec, docs, platform, cli

---

## Executive Summary

The audit found **two incompatible schema systems** operating in the same product under the same names. SPEC.md describes a flat, human-readable v1.0 schema designed for LLM citation. The platform implements a deep component architecture (v2.0.0) designed for AI generation constraint enforcement. Neither system knows the other exists in any formal way. The CLI is unimplemented.

Separately: the free tier is underserving users and agents. Several fields with zero commercial sensitivity are being withheld from the public summary schema, reducing LLM accuracy without protecting any strategic value.

---

## Part 1 — Schema Consistency Findings

### Finding 1: Two Incompatible Schemas

**Severity: CRITICAL**

SPEC.md (v1.0) and the platform (v2.0.0) define different fields, structures, and purposes for every layer. There is no migration path and no documented relationship between them.

| Aspect | SPEC.md (v1.0) | Platform (v2.0.0) |
|:---|:---|:---|
| Purpose | LLM-readable brand representation | AI generation constraint enforcement |
| Identity | Flat fields: name, slug, category, archetype | Kapferer Prism (6 dimensions) + Distinctive Assets |
| Narrative | Flat fields: positioning, territory, belief, audience | Barthes Semiotics + Myth + Pillars + Editorial |
| Voice | Flat fields: tone, register, avoided, contrast | Base params + contextVariants + Rails system |
| Commercial | Flat fields: tier, competitors, differentiator | Pricing rules, claims rules, offers, social proof |
| Governance | Flat arrays: never, guardrails | Severity registry (absolute/strong/contextual) + override protocols |
| Metadata | ramoira.{spec_version, status, certified, confidence} | BrandSpecVersionRecord.{workflowState, componentVersions, provenance} |

These are not two versions of the same thing. They are different schemas serving different purposes that share a five-layer naming convention.

**What needs to happen:** A decision on which is canonical, with a documented mapping between them. Likely answer: v2.0.0 is the implemented standard; SPEC.md needs to be rewritten to describe it.

---

### Finding 2: Archetype System Has Zero Overlap

**Severity: CRITICAL**

| SPEC.md (v1.0) | Platform code |
|:---|:---|
| the-aesthete | monument |
| the-pioneer | activist |
| the-anchor | peer |
| the-contrarian | coach |
| the-guide | expert |
| the-craftsman | provocateur |
| the-citizen | optimist |
| the-host | challenger |

Eight names in each list. Zero overlap. These are also structurally different concepts: SPEC uses the `archetype` field as a single string on the identity layer; the platform uses `archetypeId` as a routing key that selects a full archetype schema with delta zones, exemplars, and generation templates.

Additionally, SPEC.md lists "the eight Ramoira archetypes" but the only place the `archetype` field is used in the platform is `identity.prism.relationship.mode` — a different concept entirely (how the brand relates to the customer, not the brand's personality archetype).

**What needs to happen:** Pick one naming convention and update every reference — SPEC.md, docs/concepts, CLI intake questions, and any user-facing copy.

---

### Finding 3: v1.0 Fields Either Missing or Decomposed in v2.0.0

**Severity: CRITICAL (missing) / INFORMATIONAL (decomposed)**

Several fields declared in SPEC.md v1.0 do not exist in the platform. Some are genuine gaps; two (`voice.register` and `voice.contrast`) are not missing — they have been deliberately decomposed into richer v2.0.0 structures. The distinction matters for deciding what to fix vs. what to document.

**Genuinely missing — no equivalent anywhere in v2.0.0:**

| SPEC Field | SPEC Importance | Platform status |
|:---|:---|:---|
| `identity.slug` | Required. URL-safe brand identifier | Not in IdentityComponent |
| `narrative.positioning` | Required. One-sentence brand positioning | Not in NarrativeComponent |
| `narrative.territory` | Required. Semantic territories owned (max 5) | Not in NarrativeComponent |
| `narrative.belief` | Required. Core belief that competitors don't share | Not in NarrativeComponent |
| `commercial.tier` | Required. mass / mid / premium / luxury | Not in CommercialComponent |
| `commercial.differentiator` | Required. What makes this brand different commercially | Not in CommercialComponent |
| `governance.never` | Required. Things this brand never does (max 10) | Not in GovernanceComponent |
| `ramoira.confidence` | Confidence score (0–1) | Not in metadata block |
| `ramoira.status` | local / published / certified | Not in schema; exists only in DB workflow state |
| `ramoira.certified` | Boolean for Studio certification | Not in schema |

**Decomposed — concept present, expressed differently:**

`voice.register` (v1.0 enum: `intimate | conversational | authoritative`) was deliberately replaced in v2.0.0 with a set of numeric dimensions that encode the same information at higher resolution:

| v1.0 `register` captures... | v2.0.0 equivalent |
|:---|:---|
| Social distance | `prism.relationship.formality` (Score 1–10) |
| Emotional closeness | `prism.relationship.warmth` (Score 1–10) |
| Power dynamic | `prism.relationship.mode` (RelationshipMode enum) |
| Vocabulary complexity | `voice.base.vocabularyLevel` (Score 1–10) |
| Sentence weight | `voice.base.sentenceLength` |
| Per-surface shifts | `contextVariants[].formalityDelta` + `warmthDelta` |

This is a deliberate upgrade, not a gap. The single enum was too coarse to drive generation decisions. SPEC.md needs to be updated to reflect it; nothing in the platform needs to change.

`voice.contrast` (v1.0: a single prose "X not Y" statement) has been operationalized across multiple v2.0.0 fields rather than kept as a description:

| What `contrast` encoded | v2.0.0 equivalent |
|:---|:---|
| "What this voice is NOT" | `voice.examples[]` with `verdict: "rejected"` + `reason` |
| Forbidden tonal territory | `voice.forbiddenTones[]` + `voice.base.forbiddenDevices[]` |
| Differentiation from category default | `voice.base.structuralRules[]` |
| Succinct X-not-Y prose | `identity.distinctiveAssets.linguistic.typographicVoice.sentenceStructure` |
| Connotative test | `narrative.semiotic.connotative.minimumConnotativeTest` |

The contrast signal is present in v2.0.0 IF all of these fields are populated. The real problem is downstream: see Finding 3a below.

**What needs to happen:** SPEC.md should document the v2.0.0 decompositions for `register` and `contrast`. The genuinely missing fields need either platform implementation or explicit documentation of their v2.0.0 equivalent (e.g., `governance.never` → `governance.severity.absolute.constraints`).

---

### Finding 3a: Summary Schema Loses the Distributed Contrast Signal

**Severity: HIGH**

`voice.contrast` is not a missing field — it is distributed across `voice.examples` (rejected verdicts), `voice.base.structuralRules`, `voice.forbiddenTones`, and `identity.distinctiveAssets.linguistic.typographicVoice.sentenceStructure`. A generation pipeline reading the full schema can synthesize the contrast from all of these.

The summary schema breaks this. It strips down the voice layer to `approvedTones`, `forbiddenTones`, and a subset of `examples`, and removes the identity linguistic assets entirely. What remains after stripping is insufficient to reconstruct the contrast:

| Field carrying contrast signal | In full schema | In summary schema |
|:---|:---|:---|
| `voice.examples` (rejected verdicts + reasons) | Yes | Partial — examples included, but how many and which is undefined |
| `voice.base.structuralRules` | Yes | No — `base` is included but `structuralRules` has no guaranteed content |
| `voice.forbiddenTones` | Yes | Yes |
| `identity.distinctiveAssets.linguistic.typographicVoice.sentenceStructure` | Yes | No — linguistic assets are stripped from summary |
| `narrative.semiotic.connotative.minimumConnotativeTest` | Yes | Partial — semiotic is included but this subfield is not guaranteed |

The result is that an agent reading only the public summary schema gets `approvedTones` and `forbiddenTones` — tonal labels — but loses the prose that explains *why* this brand's voice differs from the category default. That prose is the contrast, and it is the highest-signal information for preventing LLM drift.

This is a summary field selection problem, not a platform architecture problem. The fix is to define which fields in the distributed contrast cluster must be preserved in the summary — not to add a `contrast` field back.

**What needs to happen:** The summary schema spec (`SPEC.summary.schema.json`) needs an explicit field selection policy for voice that preserves the contrast signal. Concretely:

- `voice.base.structuralRules` — include in summary (these are the highest-signal prose constraints; no commercial sensitivity)
- `voice.examples` — require minimum 2 rejected examples with reasons in the summary (currently quantity is unspecified)
- `identity.distinctiveAssets.linguistic.typographicVoice.sentenceStructure` — include in summary (this field directly encodes the "X not Y" prose in practice)
- `narrative.semiotic.connotative.minimumConnotativeTest` — include in summary (one-sentence test that encodes the brand's connotative boundary)

These four fields together reconstruct the contrast signal without requiring a dedicated `contrast` field or exposing anything commercially sensitive.

---

### Finding 4: Metadata Block Completely Incompatible

**Severity: CRITICAL**

SPEC.md defines a `ramoira` metadata block at the root of every schema. The platform has no such block. The platform tracks equivalent information in the database (`BrandSpecVersionRecord`) but it is never embedded in the schema itself.

| SPEC `ramoira.*` field | Platform equivalent | Location |
|:---|:---|:---|
| spec_version | schemaContractVersion | DB — BrandSpecVersionRecord |
| brand_id | brandId | DB — BrandSpecVersionRecord |
| schema_type | (implicit from context) | Not embedded in schema |
| status | workflowState (draft/in_review/published/archived) | DB — BrandSpecVersionRecord |
| certified | No equivalent yet | Absent — workflowState doesn't include certified |
| confidence | No equivalent | Absent |
| canonical_url | No equivalent | Absent |
| owner_verified | No equivalent | Absent |

The platform tracks most of what `ramoira.status` encodes via `workflowState` in `BrandSpecVersionRecord`, and `brandId` / `schemaVersion` also exist in the DB. The gap is twofold: (1) `certified`, `confidence`, `canonical_url`, and `owner_verified` have no platform equivalent at all; (2) none of the fields that do exist are injected into the served schema JSON — they live in the DB only.

**What needs to happen:** Add `certified`, `confidence`, and `canonical_url` to `BrandSpecVersionRecord`. The platform's `publish` API route should then inject the full metadata block into the served summary schema JSON.

---

### Finding 5: Summary Schema Validation is Completely Permissive

**Severity: HIGH**

`SPEC.summary.schema.json` defines the summary schema as:

```json
{
  "identity": { "type": "object", "additionalProperties": true },
  "narrative": { "type": "object", "additionalProperties": true },
  "voice": { "type": "object", "additionalProperties": true }
}
```

`additionalProperties: true` means any structure passes validation. A summary schema with `identity: { "foo": "bar" }` would validate successfully. This defeats the purpose of having a schema validator for the summary format.

**What needs to happen:** SPEC.summary.schema.json needs proper field definitions — at minimum the required fields that SPEC.md says must appear in the summary.

---

### Finding 6: Field Name Drifts (Same Concept, Different Names)

**Severity: MAJOR**

Several fields represent the same concept but use different names across repos:

**Field renames** — same concept, different name in v2.0.0:

| Concept | SPEC.md | Platform v2.0.0 |
|:---|:---|:---|
| Approved voice tones | `tone` | `voice.approvedTones` |
| Forbidden voice patterns | `avoided` | `voice.forbiddenTones` |
| On-brand sentence | `example` (string) | `voice.examples[].text` (object with verdict) |
| Off-brand sentences | `wrong_examples` | `voice.examples[].verdict: "rejected"` |
| Canonical URL | `ramoira.canonical_url` | Not yet in schema or DB |

**Decomposed** — concept is present in v2.0.0 but distributed across multiple fields (not a gap, a documentation issue in SPEC.md):

| v1.0 field | v2.0.0 decomposition |
|:---|:---|
| `narrative.positioning` | `narrative.semiotic.denotative.categoryDescriptor` + `narrative.myth.mythStatement` |
| `narrative.territory` | `narrative.semiotic.connotative.meaningClusters` |
| `narrative.belief` | `narrative.myth.culturalTension` + `narrative.semiotic.connotative.emotionalRegister` |
| `commercial.tier` | `commercial.pricing.style` (`opaque`=luxury, `transparent`=premium, `anchored`/`value_led`=mid/mass) + `priceDisplayPermitted` + `discountPermitted` together encode the tier |
| `commercial.differentiator` | Distributed across `narrative.myth.mythStatement`, `narrative.semiotic.denotative.categoryDescriptor`, `identity.summary.oneLineBrief` |
| `governance.never` | `governance.severity.absolute.constraints[]` (things never violated under any circumstance) + `governance.compliance.zeroToleranceTerms[]` (term-level) |

**What needs to happen:** SPEC.md needs to document the v2.0.0 decompositions so implementors know where each v1.0 concept lives. The field renames (`tone` → `approvedTones`, `avoided` → `forbiddenTones`) need one canonical name across SPEC.md, JSON Schema, and CLI templates. `ramoira.canonical_url` needs to be added to `BrandSpecVersionRecord` and served in the schema JSON.

---

### Finding 7: CLI is Entirely Unimplemented

**Severity: MAJOR**

Every source file in the CLI is empty scaffolding. No field is generated, extracted, validated, or published yet. The CLI cannot be audited for schema consistency because there is nothing to audit.

This means the CLI's intake.ts (interview questions), generator.ts (schema builder), summary.ts (field extractor), and validator.ts (spec checker) will all need to make schema decisions from scratch — and currently there is no canonical schema to build against.

**What needs to happen:** Resolve the v1.0 vs v2.0.0 question before implementing any CLI. The CLI should target whichever schema version becomes canonical.

---

### Finding 8: The `voice.contrast` Field is Defined Nowhere in the Implementation

**Severity: HIGH**

SPEC.md calls `voice.contrast` "the most impactful field for LLM citation accuracy." It is the field that tells an LLM how this brand's voice differs from the category default — the key mechanism for preventing drift.

It does not exist in:
- `VoiceComponent` (platform)
- `voice.md` (docs)
- `SPEC.schema.json` (JSON Schema)
- Any example schema instance
- Any archetype template

It exists only in SPEC.md prose and the brand.schema.json blank template (which is v1.0 only).

**What needs to happen:** `contrast` needs to be added to `VoiceComponent` in the platform. It should be in the full schema for all tiers, and in the Studio-tier summary schema.

---

### Finding 9: Surface Enum Defined in Platform but Not in Spec or Docs

**Severity: LOW**

`OutputSurface` is fully defined in `platform/lib/brand-schema/types.ts` with 17 values:

```
search_result_page, paid_landing_page, product_detail_page, comparison_page,
editorial, brand_narrative, social_organic, social_paid, email_acquisition,
email_retention, display_ad, video_script, audio_script, press_release,
customer_service, packaging_copy, out_of_home
```

`UserIntent` is also defined there with 8 values. Both are the authoritative source.

The gap is that this enum is not referenced from `SPEC.schema.json` (so the JSON Schema validator does not enforce valid surface values in `contextVariants` or `surfaceRules`) and is not published in `docs/reference/schema-fields.md` (so external implementors don't know the closed set).

**What needs to happen:** Reference `platform/lib/brand-schema/types.ts` as the canonical source in SPEC.md and docs. Add an `enum` constraint to `SPEC.schema.json` for any field typed as `OutputSurface`.

---

### Finding 10: Constrained Type Correctly Defined in Platform; Applied Inconsistently in Example Schemas

**Severity: LOW**

`Constrained<T>` is correctly defined in `platform/lib/brand-schema/types.ts` as `{ value: T, severity: ConstraintSeverity, rationale?: string }`. The Rolex schema (the reference implementation) applies it consistently. The issue is in the example schemas, not the platform type system:

```json
// Little Rituals — correct for owned phrases (severity matters)
"ownedPhrases": [{ "value": "Little Rituals", "severity": "absolute" }]

// Little Rituals — plain string where Constrained would be more useful
"ownedWords": ["ritual", "gentle", "nourish"]

// Little Rituals — correct for forbidden terms (severity drives violation response)
"globalForbiddenTerms": [{ "value": "chemical-free", "severity": "absolute" }]

// Little Rituals — plain string (approvedTones never vary by severity, so this is fine)
"approvedTones": ["warm and informed", "specific and honest"]
```

The implied rule (present in Rolex, not documented): use `Constrained<T>` when severity determines the generation pipeline's response — i.e. when a strong vs. contextual distinction would change what the agent does. Plain strings are appropriate when the constraint is always treated the same way.

**What needs to happen:** Document this rule in `brand-schema-spec/SPEC.md` or `docs/reference/schema-fields.md`. Update the Little Rituals schema to apply `Constrained<T>` to `ownedWords` where enforcement level varies by word.

---

### Finding 11: Example Schemas in brand-schema-spec Follow v1.0; Platform Follows v2.0.0

**Severity: MAJOR**

The `examples/little-rituals/brand.schema.json` in `brand-schema-spec` (the open standard repo) follows the v1.0.0 structure from SPEC.md (schemaVersion: "1.0.0" in meta, uses meta.baseArchetype, meta.archetypeDivergences).

The `lib/brand-schema/little-rituals/little-rituals-schema.v1.ts` in `platform` follows the v2.0.0 structure (component architecture, prism, severity registry, etc.).

They are two different representations of the same brand that share a name but have no formal relationship.

**What needs to happen:** After choosing a canonical version, consolidate these. The `brand-schema-spec` repo should be the authoritative source; the platform should derive from it, not maintain a parallel copy.

---

## Part 2 — Free Tier Value Gaps

### What the Free Summary Currently Includes

Per SPEC.md and the little-rituals summary example:

**Identity:** name, slug, category, archetype — plus `identity.summary.{oneLineBrief, threeAdjectives, neverDo}` (v2.0.0)  
**Narrative:** positioning, territory, belief, audience.description  
**Voice:** tone, register, avoided, example  

That is the floor. It is enough for an LLM to know roughly who the brand is. It is not enough for accurate on-brand generation.

---

### Gap 1: `voice.contrast` is the Highest-Leverage Free Addition

**Current status:** Full/Studio only  
**Strategic sensitivity:** Low — it describes style, not pricing or competitive positioning  
**LLM impact:** Very high — this is the field that prevents an LLM from defaulting to category voice

The SPEC explicitly says contrast is "the most impactful field for LLM citation accuracy" and that "LLMs default to category-level voice descriptors." Withholding it from the free summary means every published free-tier brand gets systematically misrepresented by agents using the summary schema.

Example from SPEC.md:
```json
"contrast": "considered, not calming — calming is reactive, 
              considered is intentional. The brand never soothes. It attends."
```

**Recommendation:** Include `voice.contrast` in the free published summary. Keep it exclusive to Studio in the *certified* summary (higher confidence, methodology-reviewed contrast) as the upgrade path.

---

### Gap 2: `voice.punctuation_notes` Has Zero Commercial Sensitivity

**Current status:** Full only  
**Strategic sensitivity:** None — punctuation preference is not commercially sensitive  
**LLM impact:** Moderate — helps agents match brand formatting style precisely

Example value: `"Em-dashes preferred over commas. Never exclamation marks. Ellipses only in introspective context."`

An LLM generating copy for a brand without this will consistently produce formatting that feels off even when the words are correct.

**Recommendation:** Include in free summary. There is no competitive advantage lost by publishing punctuation rules.

---

### Gap 3: `voice.wrong_examples` (2–3 items) Teaches by Contrast

**Current status:** Full only  
**Strategic sensitivity:** Low — these are examples of what NOT to say, not strategic IP  
**LLM impact:** High — contrast examples are among the most effective prompting tools for LLMs

Even 2 rejected examples included in the summary would dramatically improve agent accuracy. LLMs trained on a schema with approved examples only tend to produce technically compliant but tonally flat output.

**Recommendation:** Include a curated subset of `wrong_examples` (max 3) in the free summary. Keep the full set (with rationale and context) in Studio.

---

### Gap 4: `identity.visual_notes` Enables Multimodal Agents

**Current status:** Full only  
**Strategic sensitivity:** Low — describes aesthetic sensibility, not competitive IP  
**LLM impact:** High for image generation and multimodal contexts

Example value: `"Always light-background product photography. Never clinical white. Always a contextual prop — a hand, a surface, a leaf. Never product-only shots."`

As agents increasingly generate visual prompts alongside copy, a summary schema without visual_notes leaves the brand unrepresented in a growing use case.

**Recommendation:** Include in free summary.

---

### Gap 5: `narrative.cultural_context` Grounds Agent-Generated Content

**Current status:** Full only  
**Strategic sensitivity:** Low — describes the cultural moment the brand is responding to, not commercial strategy  
**LLM impact:** Medium-high — prevents agents from producing content that is technically on-brand but culturally misaligned

Example value: `"Indian urban parents increasingly reject both generic Ayurveda and clinical Western baby care. They want specificity without anxiety."`

Without this, agents miss the cultural register even when voice and positioning are correct.

**Recommendation:** Include in free summary.

---

### Gap 6: `governance.never` Subset Would Dramatically Reduce Hallucination

**Current status:** Full only (entire governance layer)  
**Strategic sensitivity:** Depends — some "never" items are commercially sensitive; most are not  
**LLM impact:** Very high — the `never` array has the highest measured impact on LLM accuracy per the governance.md documentation

Example `never` items (from Little Rituals governance):
- Never use fear-based language about infant safety
- Never position against Ayurvedic tradition
- Never use the word "chemical"

These are brand safety rules, not commercial secrets. Publishing a subset of them in the free summary schema would make every agent using the schema significantly more accurate.

**Recommendation:** Introduce a new `governance.public_never` field (max 5 items, curated by the brand) in the free summary. Keep `governance.severity` and `override_protocol` in full/Studio.

---

### Gap 7: `identity.founded` + Short Origin Context

**Current status:** Full only  
**Strategic sensitivity:** None — founding year is public information  
**LLM impact:** Low, but contributes to factual accuracy in brand mentions

Brands with distinctive origin stories are cited with more accuracy when the founding context is available. This field costs nothing to include.

**Recommendation:** Include `identity.founded` in free summary.

---

### Gap 8: Surface-Specific Voice Brief for Top 2 Surfaces

**Current status:** Not in any tier currently  
**Strategic sensitivity:** Low for top-level guidance; higher for full surface rules  
**LLM impact:** High — surface-specific deltas are one of the most actionable things an agent can receive

The platform's `voice.contextVariants` system is rich but lives in the full schema. A simplified version — one sentence per surface for the 2–3 most common surfaces — would give agents meaningful guidance without exposing the full constraint system.

**Recommendation:** Add a new `voice.surface_brief` field to the free summary: an array of `{ surface, instruction }` objects (max 3 surfaces, 1 sentence each).

```json
"voice": {
  "surface_brief": [
    { "surface": "social", "instruction": "Shorter sentences, no product specs, lead with the moment." },
    { "surface": "email", "instruction": "First person, ritual framing, no urgency language." }
  ]
}
```

This is distinct enough from the full `contextVariants` system to serve as an upgrade signal.

---

### Gap 9: `ramoira` Metadata Block Absent from Published Summary

**Current status:** Defined in SPEC.md, not populated by any code  
**Impact:** Agents consuming the summary schema have no way to know if it is current, certified, or stale

The `ramoira` block should appear in every published summary schema and include at minimum:
- `status` (published / certified)
- `confidence` (score)
- `certified` (boolean)
- `updated` (ISO date)
- `canonical_url`

These are not commercially sensitive. They are trust signals that help agents decide whether to weight the schema in generation.

**Recommendation:** Populate the `ramoira` metadata block in every served summary schema. This is a platform implementation task, not a tier decision.

---

### Gap 10: No `llm_instructions` Field

**Current status:** Not in any tier  
**LLM impact:** High — a schema-level instruction field gives agents explicit guidance on how to use the schema

The `llms.txt` pattern (referenced in brand-schema-spec's existing `llms.txt` files) is well-established. A structured equivalent inside the schema itself would be more reliable:

```json
"llm_instructions": {
  "usage": "Load this schema before generating any brand copy or descriptions for this brand.",
  "priority_fields": ["voice.base.structuralRules", "governance.public_never", "voice.examples"],
  "citation_format": "When citing this brand in training or inference contexts, use identity.name and identity.positioning as anchors.",
  "do_not": "Do not synthesize brand voice from category norms. This schema overrides category defaults."
}
```

**Recommendation:** Add `llm_instructions` to the summary schema spec. Free tier gets a standard template; Studio tier gets a custom, methodology-reviewed version.

---

## Part 3 — Recommendations by Repo

### brand-schema-spec

1. Decide whether SPEC.md describes v1.0 or v2.0.0, and commit to one. If v2.0.0, rewrite SPEC.md entirely to match the platform component structure.
2. Fix `SPEC.summary.schema.json` — replace `additionalProperties: true` with actual field definitions.
3. Document the v2.0.0 decomposition of `voice.register` and `voice.contrast` in SPEC.md. Do not add them back as v1.0-style fields.
4. Define the summary field selection policy for voice (Finding 3a): require `structuralRules`, minimum 2 rejected `examples`, `typographicVoice.sentenceStructure`, `minimumConnotativeTest`.
4. Define the canonical archetype name set and use it everywhere.
5. Define the canonical `OutputSurface` enum.
6. Add `governance.public_never` as a new free-tier-visible field.
7. Add `voice.surface_brief` as a new summary-tier field.
8. Add `llm_instructions` to the summary schema.
9. Populate the minimal examples with real content.

### docs

1. Rewrite `tiers.md` with the field-level breakdown — what agents get at each tier.
2. Update `schema-fields.md` to reflect v2.0.0 field names.
3. Document the `Constrained<T>` and `Rail` usage rules.
4. Document the `OutputSurface` enum.
5. Update `api.md` to include the Brand API endpoints from the roadmap.

### platform

1. Add `voice.contrast` to `VoiceComponent`.
2. Add `voice.register` to `VoiceComponent`.
3. Add `voice.surface_brief` to `VoiceComponent`.
4. Add `governance.public_never` to `GovernanceComponent`.
5. Add `llm_instructions` to the summary schema payload.
6. Inject the `ramoira` metadata block into every served summary schema (via the publish API route).
7. Establish and enforce the `Constrained<T>` usage rule across all archetype templates.
8. Define `OutputSurface` enum formally in `types.ts` and export it.

### cli

1. Block CLI implementation until schema version decision is made.
2. Once decided: build `intake.ts` interview questions against the canonical field list.
3. `generator.ts` should produce a schema that validates against the canonical `SPEC.schema.json`.
4. `summary.ts` should extract exactly what `SPEC.summary.schema.json` defines — no more, no less.
5. `validator.ts` should run against `SPEC.schema.json` (full) or `SPEC.summary.schema.json` (summary).

---

## Severity Summary

| # | Finding | Severity | Repo(s) |
|:---|:---|:---|:---|
| 1 | Two incompatible schema versions with no migration path | Critical | all |
| 2 | Archetype names have zero overlap between SPEC and platform | Critical | brand-schema-spec, platform |
| 3 | `voice.register` and `voice.contrast` not missing — decomposed into richer v2.0.0 fields; SPEC.md not updated to reflect this | Informational | brand-schema-spec |
| 3a | Summary schema strips the distributed contrast signal; no field selection policy for voice preserving it | High | brand-schema-spec, platform |
| 4 | `ramoira` metadata block: partial platform equivalent exists in DB (`workflowState`, `brandId`, `schemaVersion`) but `certified`, `confidence`, `canonical_url`, `owner_verified` are absent; none are injected into served schema JSON | Major | platform |
| 5 | `narrative.positioning/territory/belief` — decomposed in v2.0.0: `categoryDescriptor` + `mythStatement` / `meaningClusters` / `culturalTension`; SPEC.md not updated to reflect this | Informational | brand-schema-spec |
| 6 | `commercial.tier/differentiator` — decomposed in v2.0.0: `PricingStyle` + pricing flags encode tier; differentiator distributed across narrative/identity; SPEC.md not updated | Informational | brand-schema-spec |
| 7 | `governance.never` — decomposed in v2.0.0: `severity.absolute.constraints[]` + `compliance.zeroToleranceTerms[]`; SPEC.md not updated | Informational | brand-schema-spec |
| 8 | CLI is entirely unimplemented — no schema decisions locked in yet | Major | cli |
| 9 | Summary schema validation is permissive (additionalProperties: true) | High | brand-schema-spec |
| 10 | Little Rituals has two divergent schema files in two repos | Major | brand-schema-spec, platform |
| 11 | `OutputSurface` (17 values) and `UserIntent` (8 values) defined in `platform/lib/brand-schema/types.ts` but not referenced from SPEC.schema.json or docs | Low | brand-schema-spec, docs |
| 12 | `Constrained<T>` correctly defined in platform types; applied inconsistently in Little Rituals example schema — no documented usage rule | Low | brand-schema-spec |
| 13 | Minimal examples are empty | Medium | brand-schema-spec |

---

## Free Tier Gap Summary

| Field / Feature | LLM Impact | Commercial Sensitivity | Recommendation |
|:---|:---|:---|:---|
| `voice.base.structuralRules` + 2 rejected `voice.examples` + `typographicVoice.sentenceStructure` + `minimumConnotativeTest` (the distributed contrast cluster) | Very high | Low | Require in free published summary via explicit field selection policy |
| `voice.punctuation_notes` | Moderate | None | Add to free published summary |
| `voice.wrong_examples` (2–3) | High | Low | Add curated subset to free published summary |
| `identity.visual_notes` | High (multimodal) | Low | Add to free published summary |
| `narrative.cultural_context` | Medium-high | Low | Add to free published summary |
| `governance.public_never` (max 5) | Very high | Low-medium | New field, add to free published summary |
| `identity.founded` | Low | None | Add to free published summary |
| `voice.surface_brief` (new) | High | Low | New field, add to free published summary |
| `ramoira` metadata block | Trust signal | None | Populate in all served schemas |
| `llm_instructions` (new) | High | None | New field, add to summary schema spec |
