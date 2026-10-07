import type { Draft } from "./draft.js";
import type { IntakeAnswers } from "./intake.js";
import { OUTPUT_SURFACES } from "./surfaces.js";
import { computeContentHash } from "./validator.js";

// Assembles a 3.0.0 candidate from the owner's answers and the model's draft.
// Pure: no I/O, no model. Code, not the model, decides ids, check classes,
// provenance and the hash, so the result is valid whatever the draft says.
//
// Provenance (decisions 2026-10-07):
// - what the owner typed (forbidden words, competitors, claims, myth, tones)
//   is `authored`;
// - what the model proposed is `inherited`, `affirmed: false`, which blocks
//   ratification until the brand affirms each rule;
// - brand facts the model must not invent are left empty and marked `unfilled`.
// Judged rules are held back as `pending`: they need brand-judged examples
// (resolveJudgedRules), otherwise they become guidance questions.

type Obj = Record<string, any>;
type Scope = "all" | string[];

export interface PendingJudgedRule {
  rule_id: string;
  statement: string;
  severity: "absolute" | "strong" | "contextual";
  topic: string;
  surfaces: Scope;
}

export interface Candidate {
  schema: Obj;
  pending: PendingJudgedRule[];
}

const clean = (xs: string[] | undefined): string[] =>
  [...new Set((xs ?? []).map((x) => x.trim()).filter(Boolean))];
const clamp = (n: number, lo = 0, hi = 10): number => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : 5)));
const setIf = (o: Obj, key: string, v: unknown) => {
  if (typeof v === "string" ? v.trim() : Array.isArray(v) ? v.length : v !== undefined) o[key] = v;
  return o;
};
const slug = (s: string, max = 24) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, max).replace(/_$/, "") || "x";
const isTopic = (t: string) => /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/.test(t);

export function assembleCandidate(intake: IntakeAnswers, draft: Draft, cliVersion: string): Candidate {
  const chosen = new Set(intake.surfaces.filter((s) => OUTPUT_SURFACES.includes(s)));
  const scope = (xs: string[]): Scope => {
    const valid = clean(xs).filter((s) => chosen.has(s));
    return valid.length ? valid : "all";
  };
  const surfaceList = (xs: string[]) => clean(xs).filter((s) => chosen.has(s));

  let railN = 0;
  const rails = (rs: Array<{ context: string; instruction: string }> | undefined) =>
    (rs ?? [])
      .filter((r) => r.context?.trim() && r.instruction?.trim())
      .map((r) => ({ rail_id: `rail_${++railN}`, context: r.context.trim(), instruction: r.instruction.trim() }));

  // ── Identity ────────────────────────────────────────────────────────────
  const d = draft.identity;
  const formality = clamp(d.formality);
  const warmth = clamp(d.warmth);
  const typographicVoice: Obj = {};
  setIf(typographicVoice, "sentenceStructure", d.sentenceStructure?.trim());
  setIf(typographicVoice, "punctuationStyle", d.punctuationStyle?.trim());
  setIf(typographicVoice, "numeralStyle", d.numeralStyle?.trim());
  const identity: Obj = {
    prism: {
      physique: setIf(setIf({}, "permitted", clean(d.physiquePermitted)), "posture", d.posture?.trim()),
      personality: setIf({}, "characterBrief", d.characterBrief?.trim()),
      culture: setIf(setIf({}, "coreValues", clean(d.coreValues)), "sacredBoundary", d.sacredBoundary?.trim()),
      relationship: { formality, warmth },
      reflection: setIf(setIf({}, "depictedCustomer", d.depictedCustomer?.trim()), "ageSignal", d.ageSignal?.trim()),
      selfImage: setIf(setIf({}, "feelingDescriptors", clean(d.feelingDescriptors)), "identityStatement", d.identityStatement?.trim()),
    },
    distinctiveAssets: {
      linguistic: setIf(setIf({}, "ownedWords", clean(d.ownedWords)), "typographicVoice", Object.keys(typographicVoice).length ? typographicVoice : undefined),
    },
  };

  // ── Narrative ───────────────────────────────────────────────────────────
  const n = draft.narrative;
  const claims = clean(intake.claims).map((claim, i) => ({
    claim_id: `c_${i + 1}`,
    claim,
    evidenceRequired: false,
    evidenceType: null,
    markets: "all",
    surfaces: "all",
  }));
  const narrative: Obj = {
    semiotic: {
      denotative: setIf({ categoryDescriptor: intake.categoryDescriptor }, "claims", claims),
      connotative: {
        meaningClusters: clean(n.meaningClusters).length ? clean(n.meaningClusters) : [intake.mythStatement],
        emotionalRegister: n.emotionalRegister?.trim() || intake.approvedTones.join(", "),
      },
    },
    myth: setIf(
      setIf(setIf({ mythStatement: intake.mythStatement }, "culturalTension", n.culturalTension?.trim()), "protagonistRole", n.protagonistRole?.trim()),
      "antagonist",
      n.antagonist?.trim(),
    ),
    mythEvolution: setIf(
      setIf(setIf({}, "principle", n.mythPrinciple?.trim()), "immutableCore", n.immutableCore?.trim()),
      "modernTensions",
      (n.modernTensions ?? [])
        .filter((t) => t.tension?.trim())
        .map((t) =>
          setIf(
            setIf(setIf({ tension: t.tension.trim() }, "mythResolution", t.mythResolution?.trim()), "permittedFraming", clean(t.permittedFraming)),
            "rails",
            rails(t.rails),
          ),
        ),
    ),
    pillars: (n.pillars ?? [])
      .filter((p) => p.name?.trim() && p.coreClaim?.trim())
      .map((p) =>
        setIf(
          setIf(
            setIf(setIf({ name: p.name.trim(), coreClaim: p.coreClaim.trim() }, "description", p.description?.trim()), "approvedArcs", clean(p.approvedArcs)),
            "surfaces",
            surfaceList(p.surfaces),
          ),
          "rails",
          rails(p.rails),
        ),
      ),
    editorial: setIf(
      setIf(
        setIf(setIf({}, "openingPrinciple", n.openingPrinciple?.trim()), "structuralApproach", n.structuralApproach?.trim()),
        "referencePool",
        clean(n.referencePool),
      ),
      "timeScaleLanguage",
      n.timeScaleLanguage?.trim(),
    ),
    guidance: clean(n.guidanceQuestions).map((question) => ({ question, applies_to: "all" })),
  };

  // ── Voice ───────────────────────────────────────────────────────────────
  const v = draft.voice;
  const seenSurface = new Set<string>();
  const voice: Obj = {
    base: setIf(
      {
        vocabularyLevel: clamp(v.vocabularyLevel),
        humourStyle: setIf({ style: v.humourStyle?.trim() || "none" }, "frequency", v.humourFrequency?.trim()),
      },
      "permittedDevices",
      clean(v.permittedDevices),
    ),
    approvedTones: clean(intake.approvedTones),
    examples: [],
    contextVariants: (v.contextVariants ?? [])
      .filter((c) => chosen.has(c.surface) && !seenSurface.has(c.surface) && seenSurface.add(c.surface))
      .map((c) => {
        const out: Obj = {
          surface: c.surface,
          formalityDelta: clamp(c.formalityDelta, -formality, 10 - formality),
          warmthDelta: clamp(c.warmthDelta, -warmth, 10 - warmth),
        };
        if (["short", "varied", "long", "fragments_permitted"].includes(c.sentenceLength)) out.sentenceLength = c.sentenceLength;
        setIf(out, "openingInstruction", c.openingInstruction?.trim());
        setIf(out, "closingInstruction", c.closingInstruction?.trim());
        setIf(out, "rails", rails(c.rails));
        return setIf(out, "fallbackInstruction", c.fallbackInstruction?.trim());
      }),
    rails: { global: rails(v.globalRails) },
  };

  // ── Commercial ──────────────────────────────────────────────────────────
  const c = draft.commercial;
  const commercial: Obj = {
    pricing: setIf(setIf({ style: intake.pricingStyle }, "displayFormat", c.displayFormat?.trim()), "permittedLanguage", clean(c.permittedPricingLanguage)),
    offers: setIf(
      setIf({}, "permittedTypes", clean(c.permittedOfferTypes)),
      "communicationRules",
      c.valueFraming?.trim() ? { valueFraming: c.valueFraming.trim() } : undefined,
    ),
    socialProof: setIf(setIf({}, "celebrityEndorsementStyle", c.celebrityEndorsementStyle?.trim()), "permittedAuthoritySignals", clean(c.permittedAuthoritySignals)),
  };

  // ── Governance ──────────────────────────────────────────────────────────
  const governance: Obj = {
    conflictResolution: { defaultResolution: "escalate_to_human" },
    situations: (draft.governance.situations ?? [])
      .filter((s) => s.trigger?.trim())
      .map((s, i) => ({
        situation_id: `sit_${i + 1}_${slug(s.trigger, 20)}`,
        trigger: s.trigger.trim(),
        category: s.category,
        ...(s.posture?.trim() ? { posture: s.posture.trim() } : {}),
        surfaces: surfaceList(s.surfaces),
        voice: setIf({ persona: s.persona }, "instruction", s.instruction?.trim()),
        suspended_rule_ids: [],
      })),
    reviewTopics: clean(draft.governance.reviewTopics),
  };

  // ── Rules ───────────────────────────────────────────────────────────────
  const rules: Obj[] = [];
  const base = (topic: string) => ({
    markets: "all" as const,
    situations: "any" as const,
    modality: "text" as const,
    visibility: /^(commercial|governance)\./.test(topic) ? "private" : "public",
    rationale: null,
  });

  const words = clean(intake.forbiddenWords);
  if (words.length) {
    const topic = "identity.distinctiveAssets.linguistic";
    rules.push({
      rule_id: "r_forbidden_words",
      statement: "Never use these words or phrases.",
      check_class: "deterministic_exact",
      severity: "absolute",
      topic,
      surfaces: "all",
      ...base(topic),
      match: { terms: words, mode: "phrase", normalization: "casefold_nfkc" },
      provenance: "authored",
      affirmed: true,
    });
  }
  const rivals = clean(intake.competitors);
  if (rivals.length) {
    const topic = "commercial.claims.comparative";
    rules.push({
      rule_id: "r_competitor_names",
      statement: "Never name a competitor.",
      check_class: "deterministic_exact",
      severity: "strong",
      topic,
      surfaces: "all",
      ...base(topic),
      match: { terms: rivals, mode: "word", normalization: "casefold_nfkc" },
      provenance: "authored",
      affirmed: true,
    });
  }
  if (claims.length) {
    const topic = "narrative.denotative.claims";
    rules.push({
      rule_id: "r_claims_approved",
      statement: "Every product claim must be one of the approved claims.",
      check_class: "deterministic_structural",
      severity: "absolute",
      topic,
      surfaces: "all",
      ...base(topic),
      predicate: { type: "claim_must_be_approved", params: { against: "/narrative/semiotic/denotative/claims" } },
      provenance: "inherited",
      affirmed: false,
    });
  }

  const pending: PendingJudgedRule[] = [];
  const usedIds = new Set(rules.map((r) => r.rule_id));
  for (const r of draft.rules ?? []) {
    const statement = r.statement?.trim();
    if (!statement) continue;
    const topic = isTopic(r.topic ?? "") ? r.topic : "voice";
    let rule_id = `r_${slug(statement)}`;
    for (let k = 2; usedIds.has(rule_id); k++) rule_id = `r_${slug(statement)}_${k}`;
    usedIds.add(rule_id);
    const terms = clean(r.terms);
    if (r.kind === "exact" && terms.length) {
      rules.push({
        rule_id,
        statement,
        check_class: "deterministic_exact",
        severity: r.severity,
        topic,
        surfaces: scope(r.surfaces),
        ...base(topic),
        match: { terms, mode: "phrase", normalization: "casefold_nfkc" },
        provenance: "inherited",
        affirmed: false,
      });
    } else {
      pending.push({ rule_id, statement, severity: r.severity, topic, surfaces: scope(r.surfaces) });
    }
  }

  // ── Metadata and provenance ─────────────────────────────────────────────
  const participant = { participant_id: `p_${intake.answeredBy}`, role: intake.answeredBy };
  const fields: Record<string, string> = {
    "/narrative/semiotic/denotative/categoryDescriptor": "authored",
    "/narrative/myth/mythStatement": "authored",
    "/voice/approvedTones": "authored",
    "/identity/prism": "inherited",
    "/narrative/semiotic/connotative": "inherited",
    "/narrative/mythEvolution": "inherited",
    "/narrative/pillars": "inherited",
    "/narrative/editorial": "inherited",
    "/voice/base": "inherited",
    "/voice/contextVariants": "inherited",
    "/voice/rails": "inherited",
    "/commercial": "inherited",
    "/governance": "inherited",
    "/identity/prism/culture/originNarrative": "unfilled",
    "/identity/distinctiveAssets/linguistic/ownedPhrases": "unfilled",
    "/identity/distinctiveAssets/visual/primaryColor": "unfilled",
    "/narrative/semiotic/denotative/specifications": "unfilled",
    "/narrative/semiotic/denotative/claims": claims.length ? "authored" : "unfilled",
  };

  const schema: Obj = {
    ramoira: {
      spec_version: "3.0.0",
      schema_type: "full",
      brand_id: intake.brandId,
      schema_version: "0.1.0",
      content_hash: "",
      workflow_state: "draft",
      ratification: null,
      account_owner_verified: false,
      canonical_url: null,
      summary_opt_in: [],
    },
    rules,
    identity,
    narrative,
    voice,
    commercial,
    governance,
    draft_provenance: {
      method: "questionnaire",
      instrument_version: `ramoira-cli-${cliVersion}`,
      intake: {
        name: intake.brandName,
        category: intake.categoryDescriptor,
        description: intake.mythStatement,
        founded: intake.founded,
        source_documents: [],
      },
      participants: [participant],
      fields,
      reactions: [],
    },
  };
  schema.ramoira.content_hash = computeContentHash(schema);
  return { schema, pending };
}

/**
 * Settles the pending judged rules once the brand has judged their probes.
 * A rule backed by at least one approved and one rejected example becomes a
 * judged_bounded rule citing them; any other becomes a guidance question
 * (schema-filling process, step 7). Returns a new schema, rehashed.
 */
export function resolveJudgedRules(
  schema: Obj,
  pending: PendingJudgedRule[],
  examplesByRule: Record<string, string[]>,
): { schema: Obj; kept: string[]; toGuidance: string[] } {
  const next: Obj = structuredClone(schema);
  const examples: Obj[] = next.voice.examples ?? [];
  const kept: string[] = [];
  const toGuidance: string[] = [];

  for (const rule of pending) {
    const ids = examplesByRule[rule.rule_id] ?? [];
    const cited = examples.filter((e) => ids.includes(e.example_id));
    const hasApproved = cited.some((e) => e.verdict === "approved");
    const hasRejected = cited.some((e) => e.verdict === "rejected");
    if (hasApproved && hasRejected) {
      next.rules.push({
        rule_id: rule.rule_id,
        statement: rule.statement,
        check_class: "judged_bounded",
        severity: rule.severity,
        topic: rule.topic,
        surfaces: rule.surfaces,
        markets: "all",
        situations: "any",
        modality: "text",
        visibility: /^(commercial|governance)\./.test(rule.topic) ? "private" : "public",
        rationale: null,
        rubric: { question: null, example_refs: cited.map((e) => e.example_id), rail_refs: [] },
        provenance: "inherited",
        affirmed: false,
      });
      kept.push(rule.rule_id);
    } else {
      next.narrative.guidance = [
        ...(next.narrative.guidance ?? []),
        { question: `Does this keep to: "${rule.statement}"?`, applies_to: rule.surfaces },
      ];
      toGuidance.push(rule.rule_id);
    }
  }

  next.ramoira.content_hash = computeContentHash(next);
  return { schema: next, kept, toGuidance };
}
