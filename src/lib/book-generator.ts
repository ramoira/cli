import Anthropic from "@anthropic-ai/sdk";
import { resolveArchetype, getTheme } from "./book-archetypes.js";
import { renderBrandBook } from "./book-renderer.js";
import type { BookContent } from "./book-renderer.js";

// ── Schema accessor helpers ───────────────────────────────────────────────────

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

// ── Schema extraction (raw fields for LLM context) ───────────────────────────

interface SchemaExtract {
  brandName: string;
  oneLiner: string;
  effectiveDate: string;
  relationshipMode: string;
  threeAdjectives: string[];
  neverDo: string[];
  approvedTones: string[];
  forbiddenTones: string[];
  mythStatement: string;
  culturalTension: string;
  protagonistRole: string;
  antagonist: string;
  mythTest: string;
  mythConstraints: Array<{ constraint: string; severity: string }>;
  connotativeMeanings: string[];
  emotionalRegister: string;
  customerArchetype: string;
  feelingDescriptors: string[];
  voiceCharacterBrief: string;
  sentenceLength: string;
  vocabularyLevel: number;
  humourStyle: string;
  permittedDevices: string[];
  forbiddenDevices: string[];
  voiceExamples: Array<{
    context: string;
    text: string;
    verdict: string;
    reason: string;
  }>;
  pillars: Array<{ name: string; claim: string; description: string }>;
  absoluteConstraints: string[];
  strongConstraints: string[];
  preflight: string[];
  contextVariants: Array<{
    surface: string;
    openingInstruction: string;
    rails: Array<{ context: string; instruction: string; example?: string }>;
  }>;
}

function extractSchema(schema: Record<string, unknown>): SchemaExtract {
  const meta = obj(schema.meta);
  const identity = obj(schema.identity);
  const prism = obj(identity.prism);
  const summary = obj(identity.summary);
  const selfImage = obj(prism.selfImage);
  const reflection = obj(prism.reflection);
  const personality = obj(prism.personality);

  const narrative = obj(schema.narrative);
  const myth = obj(narrative.myth);
  const semiotic = obj(narrative.semiotic);
  const connotative = obj(semiotic.connotative);
  const pillarsRaw = arr(narrative.pillars);

  const voice = obj(schema.voice);
  const base = obj(voice.base);
  const examplesRaw = arr(voice.examples);
  const variantsRaw = arr(voice.contextVariants);

  const governance = obj(schema.governance);
  const severity = obj(governance.severity);
  const absolute = obj(severity.absolute);
  const strong = obj(severity.strong);
  const preflight = obj(governance.preflight);

  return {
    brandName: str(meta.brandName),
    oneLiner: str(summary.oneLineBrief),
    effectiveDate: str(meta.effectiveDate, new Date().toISOString().split("T")[0]),
    relationshipMode: str(obj(obj(prism).relationship).mode),
    threeAdjectives: arr(summary.threeAdjectives).map((a) => str(a)),
    neverDo: arr(summary.neverDo).map((a) => str(a)),
    approvedTones: arr(voice.approvedTones).map((a) => str(a)),
    forbiddenTones: arr(voice.forbiddenTones).map((a) => str(a)),
    mythStatement: str(myth.mythStatement),
    culturalTension: str(myth.culturalTension),
    protagonistRole: str(myth.protagonistRole),
    antagonist: str(myth.antagonist),
    mythTest: str(myth.mythTest),
    mythConstraints: arr(myth.constraints).map((c) => ({
      constraint: str(obj(c).constraint),
      severity: str(obj(c).severity),
    })),
    connotativeMeanings: arr(connotative.meaningClusters).map((a) => str(a)),
    emotionalRegister: str(connotative.emotionalRegister),
    customerArchetype: str(reflection.depictedArchetype),
    feelingDescriptors: arr(selfImage.feelingDescriptors).map((a) => str(a)),
    voiceCharacterBrief: str(personality.characterBrief),
    sentenceLength: str(base.sentenceLength),
    vocabularyLevel: typeof base.vocabularyLevel === "number" ? base.vocabularyLevel : 5,
    humourStyle: str(base.humourStyle, "none"),
    permittedDevices: arr(base.permittedDevices).map((a) => str(a)),
    forbiddenDevices: arr(base.forbiddenDevices).map((a) => str(a)),
    voiceExamples: examplesRaw.map((e) => ({
      context: str(obj(e).context),
      text: str(obj(e).text),
      verdict: str(obj(e).verdict),
      reason: str(obj(e).reason),
    })),
    pillars: pillarsRaw.map((p) => ({
      name: str(obj(p).name),
      claim: str(obj(p).coreClaim),
      description: str(obj(p).description),
    })),
    absoluteConstraints: arr(absolute.constraints).map((a) => str(a)),
    strongConstraints: arr(strong.constraints).map((a) => str(a)),
    preflight: [
      str(preflight.question1),
      str(preflight.question2),
      str(preflight.question3),
    ].filter(Boolean),
    contextVariants: variantsRaw.map((v) => ({
      surface: str(obj(v).surface),
      openingInstruction: str(obj(v).openingInstruction),
      rails: arr(obj(v).rails).map((r) => ({
        context: str(obj(r).context),
        instruction: str(obj(r).instruction),
        example: str(obj(r).example),
      })),
    })),
  };
}

// ── LLM content translation ───────────────────────────────────────────────────

const TRANSLATION_SYSTEM = `You are translating a structured brand schema into a human-readable brand book.
The brand book is read by the brand owner — not by developers or strategists.
Do not use marketing jargon, schema field names, or technical terms.
Write as if you are explaining this brand to someone who cares deeply about it.
Return valid JSON only. No explanation, no markdown.`;

function buildTranslationPrompt(extract: SchemaExtract, tone: string): string {
  return `Translate the following brand schema data into human-readable brand book content.

Tone instruction: ${tone}

Brand data:
${JSON.stringify(extract, null, 2)}

Return a JSON object with exactly this shape:
{
  "mythNarrative": "2–3 sentences telling the brand's story as a human narrative. Start with the cultural tension. Not marketing copy.",
  "mythTestHuman": "Rewrite the mythTest as a single plain-language question that resonates emotionally — the content filter question the brand owner can ask themselves.",
  "customerPortrait": "2–3 sentences describing the person this brand is talking to. A character portrait, not demographics. What do they want, what do they resist, what do they believe?",
  "voiceCharacter": "1 paragraph describing how this brand sounds. Use specific, evocative language. Describe the voice as if describing a person's way of speaking.",
  "scenarios": [
    {
      "surface": "one of the surface names from contextVariants",
      "instruction": "brief instruction for what the opening does on this surface",
      "copy": "an example sentence or two of what this brand sounds like on this surface — write it in the brand's actual voice",
      "note": "1 sentence explaining why this sounds right for this surface"
    }
  ]
}

Rules:
- mythNarrative must name a real cultural tension, not describe what the brand makes
- customerPortrait must describe a person, not a demographic segment
- voiceCharacter must be specific — name the rhythm, the register, the feeling
- scenarios: include 3–5, covering different surface types
- Do not reveal schema structure to the reader
- Write in the tone specified above`;
}

interface LlmTranslation {
  mythNarrative: string;
  mythTestHuman: string;
  customerPortrait: string;
  voiceCharacter: string;
  scenarios: Array<{
    surface: string;
    instruction: string;
    copy: string;
    note: string;
  }>;
}

async function translateWithLlm(
  extract: SchemaExtract,
  tone: string,
  apiKey: string,
): Promise<LlmTranslation> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: TRANSLATION_SYSTEM,
    messages: [
      { role: "user", content: buildTranslationPrompt(extract, tone) },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();

  try {
    return JSON.parse(raw) as LlmTranslation;
  } catch {
    throw new Error("Brand book content generation returned invalid JSON.");
  }
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function generateBrandBook(
  schema: Record<string, unknown>,
  apiKey: string,
): Promise<string> {
  const extract = extractSchema(schema);
  const archetype = resolveArchetype(extract.relationshipMode);
  const theme = getTheme(archetype);

  const translation = await translateWithLlm(extract, theme.translationTone, apiKey);

  const content: BookContent = {
    brandName: extract.brandName,
    oneLiner: extract.oneLiner || translation.mythNarrative.split(".")[0],
    effectiveDate: extract.effectiveDate,

    mythNarrative: translation.mythNarrative,
    mythTest: translation.mythTestHuman,

    customerPortrait: translation.customerPortrait,
    threeAdjectives: extract.threeAdjectives,
    neverDo: extract.neverDo,

    voiceCharacter: translation.voiceCharacter,
    approvedTones: extract.approvedTones,
    forbiddenTones: extract.forbiddenTones,
    examples: extract.voiceExamples.map((e) => ({
      surface: e.context,
      text: e.text,
      reason: e.reason,
      verdict: e.verdict === "approved" ? "approved" : "rejected",
    })),

    pillars: extract.pillars.filter((p) => p.name),

    absoluteConstraints: extract.absoluteConstraints,
    strongConstraints: extract.strongConstraints,
    preflight: extract.preflight,

    scenarios: translation.scenarios,
  };

  return renderBrandBook(content, theme);
}
