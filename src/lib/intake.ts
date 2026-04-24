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

const RELATIONSHIP_MODES = [
  { value: "peer",                    name: "peer — equal, side-by-side" },
  { value: "kind_friend",             name: "kind friend — warm and supportive" },
  { value: "coach",                   name: "coach — guiding, motivating" },
  { value: "mentor",                  name: "mentor — wise, experienced" },
  { value: "servant_to_exceptional",  name: "servant to the exceptional — deferential, exclusive" },
  { value: "fellow_activist",         name: "fellow activist — mission-driven, outspoken" },
  { value: "entertainer",             name: "entertainer — playful, engaging" },
  { value: "challenger",              name: "challenger — provocative, disruptive" },
];

const PRICING_STYLES = [
  { value: "simple",      name: "simple — straightforward pricing" },
  { value: "transparent", name: "transparent — open about all costs" },
  { value: "anchored",    name: "anchored — reference price shown first" },
  { value: "value_led",   name: "value led — lead with benefit, not price" },
  { value: "opaque",      name: "opaque — price not shown (luxury / bespoke)" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseList(raw: string, min: number, label: string): string[] {
  const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length < min) {
    throw new Error(`${label} requires at least ${min} item(s).`);
  }
  return items;
}

export async function runIntake(): Promise<IntakeAnswers> {
  console.log(chalk.bold("\nRamoira — brand schema init\n"));
  console.log(chalk.gray("Answer a few questions. Your LLM will generate the full schema.\n"));

  const brandName = await input({ message: "Brand name:" });

  const suggestedId = slugify(brandName);
  const brandId = await input({
    message: "Brand ID (URL-safe slug):",
    default: suggestedId,
  });

  const categoryDescriptor = await input({
    message: "What does your brand make or do?",
    transformer: (v) => v,
  });

  const mythStatement = await input({
    message: "One sentence — what does your brand stand for?",
  });

  const adjectivesRaw = await input({
    message: "Three words it should always feel like (comma-separated):",
  });
  const threeAdjectives = parseList(adjectivesRaw, 3, "Three adjectives").slice(0, 3);

  const relationshipMode = await select({
    message: "How does your brand relate to customers?",
    choices: RELATIONSHIP_MODES,
  });

  const approvedRaw = await input({
    message: "On-brand tones — always right (comma-separated):",
  });
  const approvedTones = parseList(approvedRaw, 1, "Approved tones");

  const forbiddenRaw = await input({
    message: "Off-brand tones — always wrong (comma-separated):",
  });
  const forbiddenTones = parseList(forbiddenRaw, 1, "Forbidden tones");

  const neverDoRaw = await input({
    message: "Five things this brand must never do (comma-separated):",
  });
  const neverDo = parseList(neverDoRaw, 5, "Never-do list");

  const pricingStyle = await select({
    message: "Pricing approach:",
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
