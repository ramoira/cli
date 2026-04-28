import type Anthropic from "@anthropic-ai/sdk";
import template from "../schemas/brand.template.json" with { type: "json" };

// ── Layer specs (embedded from brand-schema-spec/layers/) ─────────────────────

const LAYER_SPECS: Record<string, string> = {
  identity: `# Identity Component (Layer 1)

Identity is the foundational constraint layer: how the brand *is*, what it *looks like*, and the assets it *owns*.

## Top-level shape
- identity._component: 'identity'
- identity._version: string
- identity.prism: brand character structure (physique/personality/culture/relationship/reflection/selfImage)
- identity.distinctiveAssets: brand-owned assets (visual/sonic/linguistic)
- identity.summary: quick-access generation summary

## Prism substructures

prism.physique
  - permitted: string[] — visual/material forms the brand can take
  - forbidden: string[] — visual/material forms it cannot take
  - referenceURL?: URL
  - posture: string — how the brand physically presents itself

prism.personality (scored dimensions 0–10)
  - sincerity, excitement, competence, sophistication, ruggedness: Score (0–10)
  - characterBrief: string — one-paragraph AI character brief

prism.culture
  - coreValues: string[]
  - originNarrative: string — the brand's founding story as AI context
  - forbidden: string[] — cultural territory the brand cannot claim
  - sacredBoundary: string — the one thing the brand will never compromise

prism.relationship
  - mode: RelationshipMode (one of the eight archetype statements)
  - formality: Score (0–10, 0=very informal, 10=extremely formal)
  - pronoun: 'we' | 'I' | 'brand_name_only'
  - warmth: Score (0–10)
  - powerDynamic: 'brand_leads' | 'equal' | 'customer_leads'

prism.reflection
  - depictedArchetype: string — the customer the brand depicts in comms
  - aspirationalDelta: Score (0–10, how much more aspirational than actual customer)
  - forbiddenArchetypes: string[]
  - ageSignal: string

prism.selfImage
  - feelingDescriptors: string[] — how customers feel using the brand
  - identityStatement: string — how the brand sees itself
  - forbidden: string[]

## Distinctive assets

distinctiveAssets.visual
  - primaryColor: { value: HexColor, severity: 'absolute'|'strong'|'contextual', rationale: string }
  - secondaryColors: HexColor[]
  - forbiddenColors: HexColor[]
  - logoUsage: { minimumClearSpace, forbiddenBackgrounds, forbiddenModifications }
  - iconography: string[]
  - characterAssets: string[]
  - photographyStyle: { permitted, forbidden, lightingMood }

distinctiveAssets.sonic
  - sonicLogoURL?: URL
  - permittedGenres: string[]
  - forbiddenGenres: string[]
  - tempoRange: [BPM, BPM]
  - instrumentalMood: string

distinctiveAssets.linguistic
  - ownedPhrases: Constrained<string>[] — phrases the brand owns, with rationale
  - ownedWords: string[]
  - forbiddenWords: Constrained<string>[]
  - typographicVoice: { sentenceStructure, punctuationStyle, numeralStyle }

## Summary (fast-path for generation systems)
  - oneLineBrief: string
  - threeAdjectives: string[]
  - neverDo: string[]

## relationship.mode valid values (use exact string)
  - "We're like you. We just happen to know a bit more about this one thing." — Peer
  - "Things can be better. Here is a small thing that helps." — Optimist
  - "We believe in what you can do before you do." — Coach
  - "We know more. Here is the proof." — Expert
  - "Built to outlast everything. Excellence as philosophy, not strategy." — Monument
  - "Business as a force for change. Profit is the fuel, not the point." — Activist
  - "Limits are the starting point. Mediocrity is the only enemy." — Provocateur
  - "The category is broken. We are what replaces it." — Challenger`,

  narrative: `# Narrative Component (Layer 2)

Narrative encodes meaning: what the brand literally does and what it stands for, plus the brand story and the rails that protect it.

## Top-level shape
- narrative._component: 'narrative'
- narrative._version: string
- narrative.semiotic: literal + associative meaning layers
- narrative.myth: brand story layer
- narrative.mythEvolution: how myth absorbs modern tensions
- narrative.pillars: NarrativePillar[]
- narrative.editorial: long-form storytelling rules
- narrative.contentTest: quick pass/fail questions

## Semiotic layer

semiotic.denotative
  - categoryDescriptor: string — exact category the brand operates in
  - functionalClaims: string[] — claims the brand can make, each verifiable
  - specifications: string[]
  - forbiddenClaims: string[]

semiotic.connotative
  - meaningClusters: string[] — associative meanings the brand owns
  - forbiddenMeanings: string[]
  - emotionalRegister: string — the precise feeling the brand creates
  - minimumConnotativeTest: string — yes/no test for connotative minimum

semiotic.layerHierarchy: 'connotative_first' | 'balanced' | 'denotative_first'

## Myth (brand story layer — not marketing copy)

myth.culturalTension: string — the real cultural conflict this brand takes a side on
myth.mythStatement: string — one-sentence brand myth
myth.protagonistRole: string — what role the brand plays in the myth
myth.antagonist: string — what the brand stands against
myth.mythTest: string — yes/no question: does this content fit the myth?
myth.constraints: MythConstraint[]
  - constraint: string
  - severity: 'absolute' | 'strong' | 'contextual'
  - rationale: string
  - example: string

## Myth evolution
mythEvolution.principle: string — how the myth absorbs new pressures without trend-chasing
mythEvolution.modernTensions: ModernTension[]
  - tension: string
  - mythResolution: string
  - permittedFraming: string[]
  - forbiddenFraming: string[]
  - rails: Rail[]
mythEvolution.immutableCore: string — the part of the myth that never changes

## Pillars (reusable narrative modules)
pillars[]:
  - name: string
  - description: string
  - coreClaim: string
  - approvedArcs: string[]
  - forbiddenInversions: string[]
  - surfaces: string[]
  - rails: Rail[]

## Editorial guidelines
editorial.openingPrinciple: string
editorial.structuralApproach: string
editorial.forbiddenStructures: string[]
editorial.referencePool: string[]
editorial.forbiddenReferences: string[]
editorial.timeScaleLanguage: string

## Content test (three yes/no questions an AI asks before approving any output)
contentTest.mythTest: string — does this fit the myth?
contentTest.connotativeTest: string — does it carry the right connotations?
contentTest.toneTest: string — does it sound like us?`,

  voice: `# Voice Component (Layer 3)

Voice is the surface-sensitive layer: how the brand writes, and how that writing shifts by surface without drifting into category norms.

## Top-level shape
- voice._component: 'voice'
- voice._version: string
- voice.base: base VoiceParameters
- voice.forbiddenTones: string[] (absolute, all surfaces)
- voice.approvedTones: string[]
- voice.examples: VoiceExample[] (write at least 2 approved + 2 rejected with real copy)
- voice.contextVariants: VoiceVariant[] (per-surface deltas from base)
- voice.rails: PositiveRailSystem

## Base voice parameters
base.sentenceLength: 'short' | 'varied' | 'long' | 'fragments_permitted'
base.vocabularyLevel: 1–10
base.humourPermitted: boolean
base.humourStyle: 'dry' | 'self_deprecating' | 'absurdist' | 'warm' | 'irreverent' | 'none'
base.permittedDevices: string[]
base.forbiddenDevices: string[]
base.structuralRules: string[]

## Voice examples (high-signal training inputs)
examples[]:
  - context: OutputSurface | string
  - text: string (real copy, not placeholder)
  - verdict: 'approved' | 'rejected'
  - reason: string (specific reason, not generic)

## Context variants (per-surface deltas — only specify what changes from base)
contextVariants[]:
  - surface: OutputSurface
  - formalityDelta: number (negative = less formal)
  - warmthDelta: number
  - sentenceLength?: SentenceLength
  - openingInstruction: string
  - closingInstruction: string
  - rails: Rail[]
  - additionalForbidden: string[]
  - fallbackInstruction: string

## Positive rails (prevent system freeze when tactics are forbidden)
rails.global: Rail[]
rails.alternatives:
  - whenPricingForbidden: Rail[]
  - whenUrgencyForbidden: Rail[]
  - whenComparativeForbidden: Rail[]
  - whenTrendLanguageForbidden: Rail[]
  - whenAccessibilityForbidden: Rail[]
  - whenPromotionForbidden: Rail[]

A Rail object:
  - context: string — when this rail applies
  - instruction: string — what to do instead
  - example?: string — compliant example
  - antiExample?: string — non-compliant example`,

  commercial: `# Commercial Component (Layer 4)

Commercial makes conversion constraints explicit: what pricing/claims/offers/proof patterns are allowed, and how to handle high-risk surfaces.

## Top-level shape
- commercial._component: 'commercial'
- commercial._version: string
- commercial.pricing: PricingRules
- commercial.claims: ClaimsRules
- commercial.offers: OfferRules
- commercial.socialProof: SocialProofRules
- commercial.surfaceRules: SurfaceCommercialRule[]
- commercial.globalForbiddenTerms: Constrained<string>[]

## Pricing rules
pricing.style: 'opaque' | 'transparent' | 'anchored' | 'value_led' | 'simple'
pricing.priceDisplayPermitted: boolean
pricing.displayFormat?: string
pricing.surfaceOverrides?: per-surface overrides
pricing.urgencyLanguagePermitted: boolean
pricing.scarcityLanguagePermitted: boolean
pricing.discountPermitted: boolean
pricing.maxDiscountPercent?: number
pricing.permittedLanguage: string[]
pricing.forbiddenLanguage: Constrained<string>[] — { value, severity, rationale }

## Claims rules
claims.approved: ApprovedClaim[]
  - claim: string
  - evidenceRequired: boolean
  - evidenceType?: string
  - geographicScope: string[]
  - surfaces: OutputSurface[] | 'all'

claims.forbidden: Constrained<string>[]

claims.comparative
  - competitorMentionPermitted: boolean
  - comparativeClaimsPermitted: boolean
  - permittedCompetitors?: string[]
  - forbiddenFramings: string[]

claims.superlatives
  - permitted: boolean
  - approved: string[]
  - forbidden: string[]

## Offer rules
offers.permittedTypes: OfferType[]
offers.forbiddenTypes: Constrained<OfferType>[]
offers.communicationRules: { urgencyPermitted, scarcityPermitted, valueFraming }

## Social proof rules
socialProof.starRatingsPermitted: boolean
socialProof.reviewCountsPermitted: boolean
socialProof.customerTestimonialsPermitted: boolean
socialProof.celebrityEndorsementStyle?: string
socialProof.permittedAuthoritySignals: string[]
socialProof.forbiddenSocialProof: string[]

## Surface commercial rules
surfaceRules[]:
  - surface: OutputSurface
  - pricing: Partial<PricingRules>
  - fallback: FallbackBehaviour
  - alternativeApproach: string
  - rails: Rail[]`,

  governance: `# Governance Component (Layer 5)

Governance is the meta-layer that makes the system operable: severity weighting, conflict resolution, surface-specific rules, and compliance routing.

## Top-level shape
- governance._component: 'governance'
- governance._version: string
- governance.severity: SeverityRegistry
- governance.conflictResolution: ConflictResolution
- governance.surfaceRules: SurfaceRule[]
- governance.overrideProtocol: OverrideProtocol
- governance.compliance: ComplianceConfig
- governance.preflight: three binary yes/no questions

## Severity registry (three tiers)

severity.absolute
  - constraints: string[] — at least one; derive from the never-do list
  - violationResponse: 'block_output' | 'flag_and_block'

severity.strong
  - constraints: string[]
  - overrideProcess: string
  - violationResponse: 'flag_for_review' | 'block_output'

severity.contextual
  - constraints: string[]
  - judgmentBounds: string — when to use judgment vs escalate
  - violationResponse: 'log_for_audit'

## Conflict resolution
conflictResolution.componentPriority: string[] — index 0 wins (default: governance first)
conflictResolution.knownConflicts: ConflictResolutionRule[]
conflictResolution.defaultResolution: FallbackBehaviour

## Surface rules (resolve edge cases per surface)
surfaceRules[]:
  - surface: OutputSurface
  - applicableConstraints: 'all' | string[]
  - suspendedConstraints?: string[]
  - objective: string
  - primaryRail: string
  - rails: Rail[]
  - fallback: FallbackBehaviour
  - fallbackContent?: string

## Override protocol
overrideProtocol.authorisedRoles: string[]
overrideProtocol.requiredFields: string[]
overrideProtocol.maxDurationDays: number
overrideProtocol.auditLogEndpoint: string

## Compliance
compliance.violationWebhook: string
compliance.routing: { absolute, strong, contextual } — routing destinations
compliance.humanReviewTopics: string[]
compliance.zeroToleranceTerms: string[]
compliance.geographicOverrides?: per-market additions

## Preflight (three binary checks run before any content is generated)
preflight.question1: string — brand-specific yes/no check
preflight.question2: string — brand-specific yes/no check
preflight.question3: string — brand-specific yes/no check`,
};

// ── Valid enum values ─────────────────────────────────────────────────────────

const VALID_ENUMS = {
  "voice.base.sentenceLength": ["short", "varied", "long", "fragments_permitted"],
  "voice.base.humourStyle": ["dry", "self_deprecating", "absurdist", "warm", "irreverent", "none"],
  "voice.examples[].verdict": ["approved", "rejected"],
  "voice.contextVariants[].surface AND commercial.surfaceRules[].surface AND governance.surfaceRules[].surface": [
    "search_result_page",
    "paid_landing_page",
    "product_detail_page",
    "comparison_page",
    "editorial",
    "brand_narrative",
    "social_organic",
    "social_paid",
    "email_acquisition",
    "email_retention",
    "display_ad",
    "video_script",
    "audio_script",
    "press_release",
    "customer_service",
    "packaging_copy",
    "out_of_home",
  ],
  "narrative.semiotic.layerHierarchy": ["connotative_first", "balanced", "denotative_first"],
  "identity.prism.relationship.pronoun": ["we", "I", "brand_name_only"],
  "identity.prism.relationship.powerDynamic": ["brand_leads", "equal", "customer_leads"],
  "governance.severity.absolute.violationResponse": ["block_output", "flag_and_block"],
  "governance.severity.strong.violationResponse": ["flag_for_review", "block_output"],
  "governance.severity.contextual.violationResponse": ["log_for_audit"],
  "narrative.myth.constraints[].severity": ["absolute", "strong", "contextual"],
  "identity.distinctiveAssets.visual.primaryColor.severity": ["absolute", "strong", "contextual"],
  "scores (sincerity, excitement, competence, sophistication, ruggedness, formality, warmth, vocabularyLevel, aspirationalDelta)":
    "number 0–10",
};

// ── Worked example (Rolex summary — shows high-quality field population) ─────

const ROLEX_EXAMPLE = {
  meta: {
    brandId: "rolex",
    brandName: "Rolex SA",
    schemaVersion: "2.0.0",
    schemaType: "summary",
  },
  identity: {
    summary: {
      oneLineBrief: "Rolex: time mastered. Excellence made physical. Built to outlast everything.",
      threeAdjectives: ["certain", "enduring", "precise"],
      neverDo: [
        "Show or reference price in any format",
        "Use urgency, scarcity, or promotional language",
        "Reference trends, seasons, or fashion",
        "Describe Rolex as accessible or democratic",
        "Use the word 'luxury' — Rolex never categorises itself",
      ],
    },
    distinctiveAssets: {
      visual: {
        primaryColor: {
          value: "#006039",
          severity: "absolute",
          rationale: "The Rolex green is a registered trademark. Approximations dilute distinctiveness.",
        },
        photographyStyle: {
          permitted: [
            "extreme close-up of mechanical components",
            "wrist in purposeful motion — climbing, navigating, diving",
            "single watch on neutral material surface — stone, metal, leather",
          ],
          forbidden: [
            "flat lay product photography",
            "lifestyle group shots",
            "watch next to aspirational consumer goods",
          ],
          lightingMood: "Single dramatic source. Shadows that reveal form. Never fill-lit. Never cheerful.",
        },
      },
      linguistic: {
        ownedWords: ["perpetual", "superlative", "oyster", "submariner"],
        typographicVoice: {
          sentenceStructure: "Short declarative statements. Subject. Verb. Object. No questions to the reader.",
          punctuationStyle: "Full stops. En dashes for subordinate clauses. Never exclamation marks. Never ellipsis.",
          numeralStyle: "Words for ordinal references. Numerals for specifications. Years always as numerals.",
        },
      },
    },
  },
  narrative: {
    semiotic: {
      layerHierarchy: "connotative_first",
      denotative: {
        categoryDescriptor: "Swiss mechanical timepiece — Oyster case, Perpetual self-winding movement, COSC-certified Superlative Chronometer",
        functionalClaims: [
          "Swiss-made mechanical movement",
          "COSC-certified chronometer precision",
          "Waterproof Oyster case to 100–3,900 metres depending on model",
        ],
        forbiddenClaims: [
          "best watch in the world — Rolex does not make comparative superlatives",
          "investment piece — Rolex does not encourage purchase for resale value",
        ],
      },
      connotative: {
        meaningClusters: [
          "permanence — this object outlasts everything around it",
          "earned achievement — the watch as the physical record of a life well-lived",
          "mastered time — not enslaved to it, commanding it",
        ],
        forbiddenMeanings: [
          "status display — Rolex is not a signal, it is a record",
          "fashion accessory — Rolex is not seasonal",
          "democratised luxury — Rolex has never sought to be available to everyone",
        ],
        emotionalRegister: "Quiet gravity. The feeling of holding something that existed before you and will exist after you. Never loud. Never urgent.",
        minimumConnotativeTest: "Could this content have been written in 1980 and still feel exactly right in 2050?",
      },
    },
    myth: {
      mythStatement: "Some things are made to outlast everything — including the people who made them. Rolex is proof that permanence is still possible.",
      mythTest: "Does this content feel like it could endure for a generation? Or does it belong to this quarter?",
    },
    contentTest: {
      mythTest: "Could this content have been written in 1980 and still feel exactly right in 2050?",
      connotativeTest: "Does this content make the reader feel the weight of permanence, or the lightness of fashion?",
      toneTest: "Is this content certain? Does it state, rather than suggest? Does it earn its assertions?",
    },
  },
  voice: {
    base: {
      sentenceLength: "short",
      vocabularyLevel: 8,
      humourPermitted: false,
      humourStyle: "none",
      permittedDevices: ["declarative statement", "rule of three (sparsely)", "juxtaposition of time scales", "understatement"],
      forbiddenDevices: ["rhetorical questions", "exclamation marks", "hyperbole", "colloquialism", "emoji"],
      structuralRules: [
        "Rolex never refers to itself as 'we' — always 'Rolex'",
        "The brand speaks in third person, not first",
        "Short sentences. White space. Certainty.",
      ],
    },
    approvedTones: ["declarative", "certain", "quiet authority", "understated", "assured"],
    forbiddenTones: ["casual", "warm", "urgent", "promotional", "conversational", "humorous", "playful"],
    examples: [
      {
        context: "product_detail_page",
        text: "The Submariner has been to the bottom of the world and back. It was not designed for that. It was designed for everything.",
        verdict: "approved",
        reason: "Declarative. Mythic without hyperbole. Understatement. No price, no urgency, no superlative.",
      },
      {
        context: "out_of_home",
        text: "It doesn't know what year it is. That's why it works.",
        verdict: "approved",
        reason: "Short. Certain. Reinforces permanence myth. Could have been written in any decade.",
      },
      {
        context: "search_result_page",
        text: "Discover the iconic Rolex Submariner - starting from £7,250. Free shipping. Experience Swiss precision.",
        verdict: "rejected",
        reason: "Price shown (absolute violation). Promotional language. 'Iconic' is a fashion term. 'Experience' is a soft marketing verb.",
      },
      {
        context: "social_organic",
        text: "Your wrist game just got an upgrade! 🔥 This vintage Rolex is giving serious retro vibes.",
        verdict: "rejected",
        reason: "Catastrophic voice failure. Casual vernacular. Fashion accessory framing. Trend language. Exclamatory.",
      },
    ],
  },
};

// ── Tool definitions ──────────────────────────────────────────────────────────

export type RamoiraTool =
  | { name: "get_layer_spec"; input: { layer: string } }
  | { name: "get_valid_enums"; input: Record<string, never> }
  | { name: "get_example_schema"; input: Record<string, never> }
  | { name: "get_schema_template"; input: Record<string, never> };

export const TOOL_DEFINITIONS: Anthropic.Messages.Tool[] = [
  {
    name: "get_layer_spec",
    description:
      "Get the full field specification for a Ramoira schema layer. Use this before generating each layer to understand the exact fields, shapes, and constraints required.",
    input_schema: {
      type: "object" as const,
      properties: {
        layer: {
          type: "string",
          enum: ["identity", "narrative", "voice", "commercial", "governance"],
          description: "The schema layer to retrieve the specification for.",
        },
      },
      required: ["layer"],
    },
  },
  {
    name: "get_valid_enums",
    description:
      "Get all valid enum values for every constrained field in the schema. Use this to verify enum values before writing them.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_example_schema",
    description:
      "Get a high-quality worked example of a complete Ramoira brand schema. Use this to understand what well-populated fields look like in practice.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_schema_template",
    description:
      "Get the blank schema template showing all required fields and their default types. Use this as the structural scaffold you must fill in.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

export function executeTool(name: string, input: Record<string, string>): string {
  switch (name) {
    case "get_layer_spec": {
      const layer = input.layer;
      const spec = LAYER_SPECS[layer];
      return spec ?? `Unknown layer: ${layer}. Valid layers: identity, narrative, voice, commercial, governance.`;
    }
    case "get_valid_enums":
      return JSON.stringify(VALID_ENUMS, null, 2);
    case "get_example_schema":
      return JSON.stringify(ROLEX_EXAMPLE, null, 2);
    case "get_schema_template":
      return JSON.stringify(template, null, 2);
    default:
      return `Unknown tool: ${name}`;
  }
}
