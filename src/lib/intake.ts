import { input, select } from "@inquirer/prompts";
import chalk from "chalk";

export interface IntakeAnswers {
  brandName: string;
  brandId: string;
  categoryDescriptor: string;
  mythStatement: string;
  threeAdjectives: string[];
  relationshipMode: string;
  approvedTones: string[];
  forbiddenTones: string[];
  neverDo: string[];
  pricingStyle: string;
}

const ARCHETYPES = [
  {
    value: "peer",
    name: "We're like you. We just happen to know a bit more about this one thing.",
  },
  {
    value: "optimist",
    name: "Things can be better. Here is a small thing that helps.",
  },
  { value: "coach", name: "We believe in what you can do before you do." },
  { value: "expert", name: "We know more. Here is the proof." },
  {
    value: "monument",
    name: "Built to outlast everything. Excellence as philosophy, not strategy.",
  },
  {
    value: "activist",
    name: "Business as a force for change. Profit is the fuel, not the point.",
  },
  {
    value: "provocateur",
    name: "Limits are the starting point. Mediocrity is the only enemy.",
  },
  {
    value: "challenger",
    name: "The category is broken. We are what replaces it.",
  },
];

const PRICING_STYLES = [
  { value: "simple", name: "We state the price clearly and move on" },
  {
    value: "transparent",
    name: "We show all costs upfront — no surprises, ever",
  },
  {
    value: "anchored",
    name: "We reference what others charge to show our value",
  },
  {
    value: "value_led",
    name: "We lead with what it does — price comes second",
  },
  {
    value: "opaque",
    name: "We don't discuss price publicly — enquire to find out",
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseList(raw: string, min: number, label: string): string[] {
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length < min) {
    throw new Error(`${label} requires at least ${min} item(s).`);
  }
  return items;
}

export async function runIntake(): Promise<IntakeAnswers> {
  console.log(chalk.bold("\nRamoira — brand schema init\n"));
  console.log(
    chalk.gray(
      "Answer a few questions. Your LLM will generate the full schema.\n",
    ),
  );

  const brandName = await input({ message: "Brand name:" });

  const suggestedId = slugify(brandName);
  const brandId = await input({
    message: "Brand ID (URL-safe slug):",
    default: suggestedId,
  });

  const categoryDescriptor = await input({
    message: "What does your brand sell, and to whom? (Include B2B/B2C, product/service. e.g., 'B2B SaaS for accountants', 'B2C premium vegan skincare'):",
    transformer: (v) => v,
  });

  const mythStatement = await input({
    message: "What is the core belief that drives your brand? (e.g., 'Skincare should be a ritual, not a chore'):",
  });

  const adjectivesRaw = await input({
    message: "If your brand was a person, what 3 personality traits define its vibe? (e.g., rebellious, sophisticated, grounded):",
  });
  const threeAdjectives = parseList(adjectivesRaw, 3, "Three adjectives").slice(
    0,
    3,
  );

  const relationshipMode = (await select({
    message: "What is the power dynamic between your brand and your customers?",
    choices: ARCHETYPES.map(({ name }) => ({ value: name, name })),
  })) as string;

  const approvedRaw = await input({
    message:
      "When your brand writes copy, what should the writing style be? (e.g., authoritative, conversational, punchy):",
  });
  const approvedTones = parseList(approvedRaw, 1, "Approved tones");

  const forbiddenRaw = await input({
    message: "What cliché industry tones must your writing actively AVOID? (e.g., corporate jargon, preachy, overly-excited):",
  });
  const forbiddenTones = parseList(forbiddenRaw, 1, "Forbidden tones");

  const neverDoRaw = await input({
    message: "What are the absolute 'Never Do' rules for your brand? (e.g., 'never use fear tactics', 'never mention competitors'):",
  });
  const neverDo = parseList(neverDoRaw, 1, "Never-do list");

  const pricingStyle = await select({
    message: "How does your brand talk about money?",
    choices: PRICING_STYLES,
  });

  return {
    brandName,
    brandId,
    categoryDescriptor,
    mythStatement,
    threeAdjectives,
    relationshipMode,
    approvedTones,
    forbiddenTones,
    neverDo,
    pricingStyle,
  };
}
