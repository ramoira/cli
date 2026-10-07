import Anthropic from "@anthropic-ai/sdk";
import type { IntakeAnswers } from "./intake.js";

// The model's part of `ramoira init`: it proposes density and candidate rules
// from the owner's answers, in a fixed shape that code then assembles into a
// 3.0.0 schema (assemble.ts). Proposing is not authoring: every rule it
// proposes stays unaffirmed until the brand affirms it. It writes no example
// copy: sample lines come only from probes the brand judges (decision D8).

export const DRAFT_MODEL = "claude-opus-5-5";

const str = { type: "string" } as const;
const strList = { type: "array", items: str } as const;
const int = { type: "integer" } as const;
const obj = (properties: Record<string, unknown>) =>
  ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false }) as const;

const RAIL = obj({ context: str, instruction: str });

export const DRAFT_SCHEMA = obj({
  identity: obj({
    physiquePermitted: strList,
    posture: str,
    characterBrief: str,
    coreValues: strList,
    sacredBoundary: str,
    formality: int,
    warmth: int,
    depictedCustomer: str,
    ageSignal: str,
    feelingDescriptors: strList,
    identityStatement: str,
    ownedWords: strList,
    sentenceStructure: str,
    punctuationStyle: str,
    numeralStyle: str,
  }),
  narrative: obj({
    meaningClusters: strList,
    emotionalRegister: str,
    culturalTension: str,
    protagonistRole: str,
    antagonist: str,
    mythPrinciple: str,
    immutableCore: str,
    modernTensions: { type: "array", items: obj({ tension: str, mythResolution: str, permittedFraming: strList, rails: { type: "array", items: RAIL } }) },
    pillars: { type: "array", items: obj({ name: str, description: str, coreClaim: str, approvedArcs: strList, surfaces: strList, rails: { type: "array", items: RAIL } }) },
    openingPrinciple: str,
    structuralApproach: str,
    referencePool: strList,
    timeScaleLanguage: str,
    guidanceQuestions: strList,
  }),
  voice: obj({
    vocabularyLevel: int,
    humourStyle: str,
    humourFrequency: str,
    permittedDevices: strList,
    contextVariants: {
      type: "array",
      items: obj({
        surface: str,
        formalityDelta: int,
        warmthDelta: int,
        sentenceLength: { type: "string", enum: ["short", "varied", "long", "fragments_permitted"] },
        openingInstruction: str,
        closingInstruction: str,
        fallbackInstruction: str,
        rails: { type: "array", items: RAIL },
      }),
    },
    globalRails: { type: "array", items: RAIL },
  }),
  commercial: obj({
    displayFormat: str,
    permittedPricingLanguage: strList,
    permittedOfferTypes: strList,
    valueFraming: str,
    celebrityEndorsementStyle: str,
    permittedAuthoritySignals: strList,
  }),
  governance: obj({
    reviewTopics: strList,
    situations: {
      type: "array",
      items: obj({
        trigger: str,
        category: { type: "string", enum: ["crisis", "competitor_action", "accusation", "praise", "partner_request", "other"] },
        posture: str,
        surfaces: strList,
        persona: { type: "string", enum: ["normal", "restrained", "suspended"] },
        instruction: str,
      }),
    },
  }),
  rules: {
    type: "array",
    items: obj({
      statement: str,
      kind: { type: "string", enum: ["exact", "judged"] },
      terms: strList,
      severity: { type: "string", enum: ["absolute", "strong", "contextual"] },
      topic: str,
      surfaces: strList,
    }),
  },
});

type Rail = { context: string; instruction: string };
export interface Draft {
  identity: {
    physiquePermitted: string[]; posture: string; characterBrief: string; coreValues: string[]; sacredBoundary: string;
    formality: number; warmth: number; depictedCustomer: string; ageSignal: string; feelingDescriptors: string[];
    identityStatement: string; ownedWords: string[]; sentenceStructure: string; punctuationStyle: string; numeralStyle: string;
  };
  narrative: {
    meaningClusters: string[]; emotionalRegister: string; culturalTension: string; protagonistRole: string; antagonist: string;
    mythPrinciple: string; immutableCore: string;
    modernTensions: Array<{ tension: string; mythResolution: string; permittedFraming: string[]; rails: Rail[] }>;
    pillars: Array<{ name: string; description: string; coreClaim: string; approvedArcs: string[]; surfaces: string[]; rails: Rail[] }>;
    openingPrinciple: string; structuralApproach: string; referencePool: string[]; timeScaleLanguage: string; guidanceQuestions: string[];
  };
  voice: {
    vocabularyLevel: number; humourStyle: string; humourFrequency: string; permittedDevices: string[];
    contextVariants: Array<{
      surface: string; formalityDelta: number; warmthDelta: number; sentenceLength: "short" | "varied" | "long" | "fragments_permitted";
      openingInstruction: string; closingInstruction: string; fallbackInstruction: string; rails: Rail[];
    }>;
    globalRails: Rail[];
  };
  commercial: {
    displayFormat: string; permittedPricingLanguage: string[]; permittedOfferTypes: string[]; valueFraming: string;
    celebrityEndorsementStyle: string; permittedAuthoritySignals: string[];
  };
  governance: {
    reviewTopics: string[];
    situations: Array<{
      trigger: string; category: "crisis" | "competitor_action" | "accusation" | "praise" | "partner_request" | "other";
      posture: string; surfaces: string[]; persona: "normal" | "restrained" | "suspended"; instruction: string;
    }>;
  };
  rules: Array<{ statement: string; kind: "exact" | "judged"; terms: string[]; severity: "absolute" | "strong" | "contextual"; topic: string; surfaces: string[] }>;
}

const SYSTEM = `You draft a candidate brand schema (Ramoira spec 3.0.0) from a brand owner's answers. The brand reviews and ratifies it later; until then it is only a proposal.

What you write:
- Density: the material producers write from (who the brand is, what it means, how it sounds, how it sells). Be specific to this brand; generic category language is useless.
- Rules: things content must never do, each one checkable. "exact" rules name words or phrases in "terms". "judged" rules need judgment; give a precise statement and leave "terms" empty. Base rules on the owner's answers (never-do list, tones to avoid, how they talk about money). Do not repeat the owner's forbidden words, claims or competitors as rules: those are recorded separately.
- Rails: when a tactic is ruled out, what to do instead. Give the context and the instruction only.
- guidanceQuestions: one or two questions a writer can ask of any draft.

What you must not write:
- No sample copy, example lines, taglines or slogans anywhere. Sample lines come only from the brand's own judgments.
- No invented facts: no founding story, owned phrases, colours, product specifications, prices, awards or claims. If the answers do not give a fact, leave it out.
- No scores of the brand and no archetype labels.

Scales (formality, warmth, vocabularyLevel) are integers 0–10 on these anchors: 1 text-message register / cold / simplest words; 3 friendly but not informal / reserved / plain, no jargon; 5 clear and direct / approachable / everyday professional; 7 formal, not casual / warm, personal / precise, terms explained; 9 ceremonial / intimate / specialist. Context-variant deltas move along the same scales and must keep the result within 0–10.

Surfaces must be from the list the owner chose. Topics are dot paths such as voice.tone, narrative.connotative, commercial.pricing.urgency, identity.prism.culture.`;

function userMessage(intake: IntakeAnswers): string {
  const list = (xs: string[]) => (xs.length ? xs.join("; ") : "(none given)");
  return `Owner's answers:
- Brand: ${intake.brandName}
- What they make, and for whom: ${intake.categoryDescriptor}
- What the brand believes: ${intake.mythStatement}
- Founded: ${intake.founded ?? "(not given)"}
- Sounds: ${list(intake.approvedTones)}
- Never sounds: ${list(intake.avoidTones)}
- Never does: ${list(intake.neverDo)}
- Words never to use (recorded separately): ${list(intake.forbiddenWords)}
- Product claims (recorded separately): ${list(intake.claims)}
- Competitors never to name (recorded separately): ${list(intake.competitors)}
- Surfaces: ${intake.surfaces.join(", ")}
- Money: ${intake.pricingStyle}

Draft the candidate. Include a context variant for each surface, two to four pillars, at least one modern tension, and global rails.`;
}

export async function draftCandidate(intake: IntakeAnswers, apiKey: string): Promise<Draft> {
  const client = new Anthropic({ apiKey });
  const stream = client.beta.messages.stream({
    model: DRAFT_MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: DRAFT_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage(intake) }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") throw new Error("The model declined to draft this schema.");
  if (message.stop_reason === "max_tokens") throw new Error("The draft was cut off before it finished. Try again.");
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return JSON.parse(text) as Draft;
}
