// Extracts the public summary schema from a full brand.schema.json.
// The summary is what gets published at ramoira.com/brands/[slug]/schema.summary.json.
// It omits commercially sensitive fields (pricing detail, full governance, offers)
// while preserving the fields that give agents accurate on-brand generation signals.

export interface SummaryMeta {
  brandId: string;
  brandName: string;
  schemaVersion: string;
  ramoira?: {
    status?: string;
    certified?: boolean;
    confidence?: number;
    canonicalUrl?: string;
    updatedAt?: string;
  };
}

export interface SummaryIdentity {
  summary: {
    oneLineBrief: string;
    threeAdjectives: string[];
    neverDo: string[];
  };
  relationshipMode?: string;
  linguisticVoice?: {
    sentenceStructure?: string;
    punctuationStyle?: string;
  };
}

export interface SummaryNarrative {
  categoryDescriptor: string;
  meaningClusters: string[];
  emotionalRegister: string;
  minimumConnotativeTest?: string;
  mythStatement: string;
  mythTest: string;
  culturalTension?: string;
}

export interface SummaryVoiceExample {
  text: string;
  verdict: "approved" | "rejected";
  reason: string;
  context?: string;
}

export interface SummaryVoice {
  approvedTones: string[];
  forbiddenTones: string[];
  examples: SummaryVoiceExample[];
  structuralRules?: string[];
}

export interface SummarySchema {
  meta: SummaryMeta;
  identity: SummaryIdentity;
  narrative: SummaryNarrative;
  voice: SummaryVoice;
}

type AnyObj = Record<string, unknown>;

function get<T>(obj: unknown, ...keys: string[]): T | undefined {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as AnyObj)[k];
  }
  return cur as T;
}

export function extractSummary(full: unknown): SummarySchema {
  const f = full as AnyObj;
  const meta = (f.meta ?? {}) as AnyObj;
  const identity = (f.identity ?? {}) as AnyObj;
  const narrative = (f.narrative ?? {}) as AnyObj;
  const voice = (f.voice ?? {}) as AnyObj;

  const identitySummary = (identity.summary ?? {}) as AnyObj;
  const semiotic = (get<AnyObj>(narrative, "semiotic") ?? {}) as AnyObj;
  const denotative = (get<AnyObj>(semiotic, "denotative") ?? {}) as AnyObj;
  const connotative = (get<AnyObj>(semiotic, "connotative") ?? {}) as AnyObj;
  const myth = (get<AnyObj>(narrative, "myth") ?? {}) as AnyObj;
  const voiceBase = (voice.base ?? {}) as AnyObj;
  const linguistic = get<AnyObj>(identity, "distinctiveAssets", "linguistic") ?? {};
  const typographic = get<AnyObj>(linguistic, "typographicVoice") ?? {};

  // Voice examples: include approved + rejected (at least 2 total, prefer to include
  // rejected examples since they carry the contrast signal)
  const allExamples = (voice.examples as SummaryVoiceExample[] | undefined) ?? [];
  const approved = allExamples.filter((e) => e.verdict === "approved").slice(0, 2);
  const rejected = allExamples.filter((e) => e.verdict === "rejected").slice(0, 2);
  const summaryExamples = [...approved, ...rejected];

  return {
    meta: {
      brandId: (meta.brandId as string) ?? "",
      brandName: (meta.brandName as string) ?? "",
      schemaVersion: (meta.schemaVersion as string) ?? "2.0.0",
    },
    identity: {
      summary: {
        oneLineBrief: (identitySummary.oneLineBrief as string) ?? "",
        threeAdjectives: (identitySummary.threeAdjectives as string[]) ?? [],
        neverDo: (identitySummary.neverDo as string[]) ?? [],
      },
      ...(get<string>(identity, "prism", "relationship", "mode") !== undefined
        ? { relationshipMode: get<string>(identity, "prism", "relationship", "mode") }
        : {}),
      ...((typographic as AnyObj).sentenceStructure !== undefined ||
        (typographic as AnyObj).punctuationStyle !== undefined
        ? {
            linguisticVoice: {
              sentenceStructure: (typographic as AnyObj).sentenceStructure as string | undefined,
              punctuationStyle: (typographic as AnyObj).punctuationStyle as string | undefined,
            },
          }
        : {}),
    },
    narrative: {
      categoryDescriptor: (denotative.categoryDescriptor as string) ?? "",
      meaningClusters: (connotative.meaningClusters as string[]) ?? [],
      emotionalRegister: (connotative.emotionalRegister as string) ?? "",
      ...(connotative.minimumConnotativeTest !== undefined
        ? { minimumConnotativeTest: connotative.minimumConnotativeTest as string }
        : {}),
      mythStatement: (myth.mythStatement as string) ?? "",
      mythTest: (myth.mythTest as string) ?? "",
      ...(myth.culturalTension !== undefined
        ? { culturalTension: myth.culturalTension as string }
        : {}),
    },
    voice: {
      approvedTones: (voice.approvedTones as string[]) ?? [],
      forbiddenTones: (voice.forbiddenTones as string[]) ?? [],
      examples: summaryExamples,
      ...((voiceBase.structuralRules as string[] | undefined)?.length
        ? { structuralRules: voiceBase.structuralRules as string[] }
        : {}),
    },
  };
}
