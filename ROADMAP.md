# Ramoira — Cross-Repo Roadmap

> Platform v2.0.0 is ground truth. brand-schema-spec and docs align to it. CLI follows after.

**Last updated:** 2026-04-22
**Status:** Active — Phase 1 in progress

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
| `brand-schema-spec` | Open standard — SPEC.md, JSON validators, blank templates, examples | [brand-schema-spec/ROADMAP.md](../brand-schema-spec/ROADMAP.md) | Phase 1 in progress (1.1–1.4 done) |
| `docs` | User-facing guides, field reference, integration docs | [docs/ROADMAP.md](../docs/ROADMAP.md) | Blocked on Phase 1 |
| `cli` | `init`, `publish`, `studio`, `validate`, `status` | This file | Deferred — begins after spec + docs stable |

---

## Delivery Sequence

```
Phase 1 (brand-schema-spec) ✅ 1.1–1.4 done, ⬜ 1.5–1.8 pending
  → see brand-schema-spec/ROADMAP.md

Phase 2 (docs) ⬜ blocked on Phase 1
  → see docs/ROADMAP.md

Phase 3 (platform) ⬜ unblocked after Phase 1.3 ✅
  → see platform/ROADMAP.md

Phase 4 (CLI) ⬜ begins after Phase 1 + 2 complete
  ⬜ 4.1 init
  ⬜ 4.2 validate
  ⬜ 4.3 publish
  ⬜ 4.4 studio
  ⬜ 4.5 status
  ⬜ 4.6 auth token management
```

---

## Phase 4 — CLI (deferred)

CLI begins after Phase 1 and Phase 2 are stable. Builds against:
- `brand-schema-spec/SPEC.schema.json` and `SPEC.summary.schema.json` as validators
- `brand-schema-spec/schemas/` blank templates as generation targets
- Platform Brand API endpoints (Phase 3) for publish/status

Commands: `init`, `validate`, `publish`, `studio`, `status`, auth token management.

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
| `brand-schema-spec` | Rewrite in progress. SPEC.md, SPEC.schema.json, SPEC.summary.schema.json, blank templates done (1.1–1.4). Examples not yet updated. |
| `docs` | Describes v1.0 field names. Rewrite blocked until Phase 1 examples stable. |
| `cli` | Empty scaffolding. Deferred until Phase 1 + 2 complete. |
