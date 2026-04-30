// Archetype theme configs — one per relationship.mode value.
// Visual identity adapts to the archetype without disclosing it.

export type ArchetypeKey =
  | "peer"
  | "optimist"
  | "coach"
  | "expert"
  | "monument"
  | "activist"
  | "provocateur"
  | "challenger";

export interface ArchetypeTheme {
  key: ArchetypeKey;
  // Google Fonts import URL
  fontsUrl: string;
  // CSS custom property overrides (injected into :root)
  css: Record<string, string>;
  // Section heading language — never exposes the archetype name
  labels: {
    chapterMythTitle: string;         // "The Story We Tell"
    chapterIdentityTitle: string;     // "Who We're Talking To"
    chapterVoiceTitle: string;        // "What We Sound Like"
    chapterPillarsTitle: string;      // "What We Stand For"
    chapterRulesTitle: string;        // "The Lines We Hold"
    chapterScenariosTitle: string;    // "In Real Situations"
    closingStatement: string;         // closing section text
    storyLabel: string;               // label above myth quote block
    portraitLabel: string;            // label above customer portrait
  };
  // Tone instruction passed to LLM for content translation
  translationTone: string;
}

// ── Relationship mode → archetype key ────────────────────────────────────────

const MODE_TO_ARCHETYPE: Record<string, ArchetypeKey> = {
  "We're like you. We just happen to know a bit more about this one thing.": "peer",
  "Things can be better. Here is a small thing that helps.": "optimist",
  "We believe in what you can do before you do.": "coach",
  "We know more. Here is the proof.": "expert",
  "Built to outlast everything. Excellence as philosophy, not strategy.": "monument",
  "Business as a force for change. Profit is the fuel, not the point.": "activist",
  "Limits are the starting point. Mediocrity is the only enemy.": "provocateur",
  "The category is broken. We are what replaces it.": "challenger",
};

export function resolveArchetype(relationshipMode: string): ArchetypeKey {
  return MODE_TO_ARCHETYPE[relationshipMode] ?? "peer";
}

// ── Theme definitions ─────────────────────────────────────────────────────────

const THEMES: Record<ArchetypeKey, ArchetypeTheme> = {
  peer: {
    key: "peer",
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Lora:ital,wght@0,400;0,500;1,400&display=swap",
    css: {
      "--bg": "#F7F5F2",
      "--surface": "#FFFFFF",
      "--surface-alt": "#F0EDE8",
      "--ink": "#1E1E1E",
      "--ink-mid": "#4A4540",
      "--ink-faint": "#9A938C",
      "--accent": "#6B8F71",
      "--accent-deep": "#4A6B50",
      "--accent-faint": "#C8DCC9",
      "--cover-bg": "#3D5C42",
      "--cover-text": "#F0EDE8",
      "--cover-sub": "#A8C4AA",
      "--rule": "#C8DCC9",
      "--pass-bg": "#EEF6EE",
      "--pass-border": "#B8D8B8",
      "--pass-text": "#2A5A2A",
      "--fail-bg": "#FAEEEE",
      "--fail-border": "#DDB8B8",
      "--fail-text": "#5A2A2A",
      "--font-serif": "'Lora', Georgia, serif",
      "--font-sans": "'Lato', system-ui, sans-serif",
    },
    labels: {
      chapterMythTitle: "What We're About",
      chapterIdentityTitle: "Who We're Talking To",
      chapterVoiceTitle: "How We Sound",
      chapterPillarsTitle: "The Things We Care About",
      chapterRulesTitle: "What We Always Do. What We Never Do.",
      chapterScenariosTitle: "Us in the Real World",
      closingStatement: "This is how we show up. Every time.",
      storyLabel: "Our belief",
      portraitLabel: "The person we're talking to",
    },
    translationTone:
      "Warm, conversational, first-person plural. Write like a knowledgeable friend, not a brand strategist. Use 'we' freely. Avoid jargon. Short paragraphs.",
  },

  optimist: {
    key: "optimist",
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=DM+Serif+Display:ital@0;1&display=swap",
    css: {
      "--bg": "#FAFAF7",
      "--surface": "#FFFFFF",
      "--surface-alt": "#F5F3ED",
      "--ink": "#1A1A18",
      "--ink-mid": "#4A4A40",
      "--ink-faint": "#9A9A88",
      "--accent": "#D4943A",
      "--accent-deep": "#A8720A",
      "--accent-faint": "#F5E4C8",
      "--cover-bg": "#F5E4C8",
      "--cover-text": "#2A1A08",
      "--cover-sub": "#9A7240",
      "--rule": "#F0D8A8",
      "--pass-bg": "#EEF6EE",
      "--pass-border": "#B8D8B8",
      "--pass-text": "#2A5A2A",
      "--fail-bg": "#FAEEEE",
      "--fail-border": "#DDB8B8",
      "--fail-text": "#5A2A2A",
      "--font-serif": "'DM Serif Display', Georgia, serif",
      "--font-sans": "'DM Sans', system-ui, sans-serif",
    },
    labels: {
      chapterMythTitle: "What We Believe",
      chapterIdentityTitle: "Who This Is For",
      chapterVoiceTitle: "How We Speak",
      chapterPillarsTitle: "The Better Way",
      chapterRulesTitle: "What We Stand For. What We Won't Do.",
      chapterScenariosTitle: "What This Looks Like",
      closingStatement: "Small things, done consistently, make everything better.",
      storyLabel: "The belief behind everything we make",
      portraitLabel: "The person we had in mind",
    },
    translationTone:
      "Optimistic, accessible, forward-looking. Focus on possibility and improvement. Light but not frivolous. Short sentences. No jargon.",
  },

  coach: {
    key: "coach",
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Fraunces:ital,wght@0,400;0,600;1,400&display=swap",
    css: {
      "--bg": "#F5F7FA",
      "--surface": "#FFFFFF",
      "--surface-alt": "#EDF0F5",
      "--ink": "#0D1117",
      "--ink-mid": "#3A4050",
      "--ink-faint": "#8A90A0",
      "--accent": "#2B4C8C",
      "--accent-deep": "#1A3070",
      "--accent-faint": "#C8D4EC",
      "--cover-bg": "#1A3070",
      "--cover-text": "#FFFFFF",
      "--cover-sub": "#8AA0D0",
      "--rule": "#C8D4EC",
      "--pass-bg": "#EEF6EE",
      "--pass-border": "#B8D8B8",
      "--pass-text": "#2A5A2A",
      "--fail-bg": "#FAEEEE",
      "--fail-border": "#DDB8B8",
      "--fail-text": "#5A2A2A",
      "--font-serif": "'Fraunces', Georgia, serif",
      "--font-sans": "'Inter', system-ui, sans-serif",
    },
    labels: {
      chapterMythTitle: "What We Stand For",
      chapterIdentityTitle: "Who We're Here For",
      chapterVoiceTitle: "How We Communicate",
      chapterPillarsTitle: "The Principles",
      chapterRulesTitle: "The Non-Negotiables",
      chapterScenariosTitle: "The Standard in Practice",
      closingStatement: "We hold the standard so you can meet it.",
      storyLabel: "The conviction",
      portraitLabel: "The person we believe in",
    },
    translationTone:
      "Confident, direct, motivating. Written from a position of belief in the reader's potential. Structured but not cold. Active verbs. No hedging.",
  },

  expert: {
    key: "expert",
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;1,400&family=IBM+Plex+Serif:ital,wght@0,400;0,500;1,400&display=swap",
    css: {
      "--bg": "#F8F9FA",
      "--surface": "#FFFFFF",
      "--surface-alt": "#EDF0F2",
      "--ink": "#0A0A0F",
      "--ink-mid": "#383A40",
      "--ink-faint": "#88909A",
      "--accent": "#1A1A2E",
      "--accent-deep": "#0A0A1A",
      "--accent-faint": "#D0D2DC",
      "--cover-bg": "#0A0A1A",
      "--cover-text": "#F0F0F8",
      "--cover-sub": "#7878A0",
      "--rule": "#D0D2DC",
      "--pass-bg": "#EEF6EE",
      "--pass-border": "#B8D8B8",
      "--pass-text": "#2A5A2A",
      "--fail-bg": "#FAEEEE",
      "--fail-border": "#DDB8B8",
      "--fail-text": "#5A2A2A",
      "--font-serif": "'IBM Plex Serif', Georgia, serif",
      "--font-sans": "'IBM Plex Sans', system-ui, sans-serif",
    },
    labels: {
      chapterMythTitle: "What We Know",
      chapterIdentityTitle: "Who Comes to Us",
      chapterVoiceTitle: "How We Communicate",
      chapterPillarsTitle: "The Evidence Base",
      chapterRulesTitle: "What We Assert. What We Don't.",
      chapterScenariosTitle: "The Standard Applied",
      closingStatement: "The work speaks. We provide the proof.",
      storyLabel: "The position",
      portraitLabel: "The person who trusts expertise",
    },
    translationTone:
      "Precise, authoritative, evidence-grounded. Third-person preferred. Measured pace. Claims backed by rationale. No enthusiasm, no hedging. Write like a leader in the field.",
  },

  monument: {
    key: "monument",
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap",
    css: {
      "--bg": "#FAF6EF",
      "--surface": "#F5EDE0",
      "--surface-alt": "#EDE4D4",
      "--ink": "#1E1610",
      "--ink-mid": "#5A4838",
      "--ink-faint": "#A08870",
      "--accent": "#9A7A4A",
      "--accent-deep": "#6A5030",
      "--accent-faint": "#DDD0B8",
      "--cover-bg": "#1E1610",
      "--cover-text": "#F5EDE0",
      "--cover-sub": "#9A7A4A",
      "--rule": "#C8B090",
      "--pass-bg": "#EEF6EE",
      "--pass-border": "#B8D8B8",
      "--pass-text": "#2A5A2A",
      "--fail-bg": "#FAEEEE",
      "--fail-border": "#DDB8B8",
      "--fail-text": "#5A2A2A",
      "--font-serif": "'Playfair Display', 'EB Garamond', Georgia, serif",
      "--font-sans": "'DM Sans', system-ui, sans-serif",
    },
    labels: {
      chapterMythTitle: "What Endures",
      chapterIdentityTitle: "Who This Is Built For",
      chapterVoiceTitle: "How It Speaks",
      chapterPillarsTitle: "What It Stands On",
      chapterRulesTitle: "What It Will Never Do",
      chapterScenariosTitle: "The Standard in the World",
      closingStatement: "Built to outlast the moment it was made in.",
      storyLabel: "The conviction behind everything",
      portraitLabel: "The person who understands permanence",
    },
    translationTone:
      "Measured, weighty, declarative. Third-person. Short sentences with long silences between them. Nothing is described as 'exciting' or 'innovative'. Permanence over urgency. Earned weight.",
  },

  activist: {
    key: "activist",
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Spectral:ital,wght@0,400;0,500;1,400&display=swap",
    css: {
      "--bg": "#F5FAF5",
      "--surface": "#FFFFFF",
      "--surface-alt": "#E8F5E8",
      "--ink": "#0A1A0A",
      "--ink-mid": "#2A4A2A",
      "--ink-faint": "#6A8A6A",
      "--accent": "#1A6B3C",
      "--accent-deep": "#0A4A28",
      "--accent-faint": "#B8DCC8",
      "--cover-bg": "#0A3A1A",
      "--cover-text": "#F0FAF0",
      "--cover-sub": "#6AB88A",
      "--rule": "#B8DCC8",
      "--pass-bg": "#EEF6EE",
      "--pass-border": "#B8D8B8",
      "--pass-text": "#2A5A2A",
      "--fail-bg": "#FAEEEE",
      "--fail-border": "#DDB8B8",
      "--fail-text": "#5A2A2A",
      "--font-serif": "'Spectral', Georgia, serif",
      "--font-sans": "'Space Grotesk', system-ui, sans-serif",
    },
    labels: {
      chapterMythTitle: "What We're Fighting For",
      chapterIdentityTitle: "Who Fights With Us",
      chapterVoiceTitle: "How We Speak",
      chapterPillarsTitle: "The Four Commitments",
      chapterRulesTitle: "The Lines We Hold",
      chapterScenariosTitle: "The Mission in Action",
      closingStatement: "Profit is the fuel. This is the point.",
      storyLabel: "The fight",
      portraitLabel: "The person who gives a damn",
    },
    translationTone:
      "Mission-driven, purposeful, direct. First-person plural. Conviction without preachiness. The cause is stated clearly. Commercial considerations are secondary to the mission. Energised but not evangelical.",
  },

  provocateur: {
    key: "provocateur",
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap",
    css: {
      "--bg": "#F5F5F5",
      "--surface": "#FFFFFF",
      "--surface-alt": "#EBEBEB",
      "--ink": "#080808",
      "--ink-mid": "#303030",
      "--ink-faint": "#888888",
      "--accent": "#E8192C",
      "--accent-deep": "#B80018",
      "--accent-faint": "#FADDE0",
      "--cover-bg": "#080808",
      "--cover-text": "#F5F5F5",
      "--cover-sub": "#888888",
      "--rule": "#D8D8D8",
      "--pass-bg": "#EEF6EE",
      "--pass-border": "#B8D8B8",
      "--pass-text": "#2A5A2A",
      "--fail-bg": "#FAEEEE",
      "--fail-border": "#DDB8B8",
      "--fail-text": "#5A2A2A",
      "--font-serif": "'Cormorant Garamond', Georgia, serif",
      "--font-sans": "'Outfit', system-ui, sans-serif",
    },
    labels: {
      chapterMythTitle: "What Limits Are For",
      chapterIdentityTitle: "Who Gets It",
      chapterVoiceTitle: "How We Write",
      chapterPillarsTitle: "What Drives It",
      chapterRulesTitle: "The Only Rule. And What It Kills.",
      chapterScenariosTitle: "What This Sounds Like",
      closingStatement: "Mediocrity had its chance.",
      storyLabel: "The position",
      portraitLabel: "The person who wants to go further",
    },
    translationTone:
      "Blunt, unapologetic, self-assured. No softening language. Does not ask permission. Sentences that land hard. The brand sees limits as the starting point, not the constraint.",
  },

  challenger: {
    key: "challenger",
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap",
    css: {
      "--bg": "#FFFFFF",
      "--surface": "#F8F8F8",
      "--surface-alt": "#EFEFEF",
      "--ink": "#0A0A0A",
      "--ink-mid": "#2A2A2A",
      "--ink-faint": "#7A7A7A",
      "--accent": "#E85A1A",
      "--accent-deep": "#C03800",
      "--accent-faint": "#FAE0D4",
      "--cover-bg": "#0A0A0A",
      "--cover-text": "#FFFFFF",
      "--cover-sub": "#7A7A7A",
      "--rule": "#E0E0E0",
      "--pass-bg": "#EEF6EE",
      "--pass-border": "#B8D8B8",
      "--pass-text": "#2A5A2A",
      "--fail-bg": "#FAEEEE",
      "--fail-border": "#DDB8B8",
      "--fail-text": "#5A2A2A",
      "--font-serif": "'Libre Baskerville', Georgia, serif",
      "--font-sans": "'Syne', system-ui, sans-serif",
    },
    labels: {
      chapterMythTitle: "What's Broken. What We Replace It With.",
      chapterIdentityTitle: "Who This Is Built For",
      chapterVoiceTitle: "How We Say It",
      chapterPillarsTitle: "The New Standard",
      chapterRulesTitle: "What We Refuse to Do",
      chapterScenariosTitle: "The Challenger in Practice",
      closingStatement: "The category was broken. This is what replaces it.",
      storyLabel: "The case for change",
      portraitLabel: "The person who knows the category is broken",
    },
    translationTone:
      "Confrontational, precise, confident. Every sentence implies the old way was wrong. Direct. Active voice. No hedging. The reader should feel the weight of the category being dismantled.",
  },
};

export function getTheme(archetype: ArchetypeKey): ArchetypeTheme {
  return THEMES[archetype];
}
