import chalk from "chalk";
import { checkbox, input, select } from "@inquirer/prompts";
import { OUTPUT_SURFACES, surfaceLabel } from "./surfaces.js";

// The offline questionnaire for `ramoira init` (roadmap C1, D7). Archetype-
// anchored drafting is a hosted service (`init --anchored`); this path asks
// what feeds a 3.0.0 schema directly: facts, rules and voice.

export type AnswerRole = "brand_owner" | "brand_team" | "agency" | "freelancer";

export interface IntakeAnswers {
  answeredBy: AnswerRole;
  brandName: string;
  brandId: string;
  categoryDescriptor: string;
  mythStatement: string;
  founded: string | null;
  approvedTones: string[];
  avoidTones: string[];
  neverDo: string[];
  forbiddenWords: string[];
  claims: string[];
  competitors: string[];
  surfaces: string[];
  pricingStyle: string;
}

const PRICING_STYLES = [
  { value: "simple", name: "We state the price clearly and move on" },
  { value: "transparent", name: "We show all costs upfront — no surprises" },
  { value: "value_led", name: "We lead with what it does — price comes second" },
  { value: "opaque", name: "We don't discuss price publicly — enquire to find out" },
];

const DEFAULT_SURFACES = ["product_detail_page", "social_organic", "email_acquisition"];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Splits a comma- or semicolon-separated answer. Semicolons win when present, so commas can sit inside items. */
export function parseList(raw: string): string[] {
  const sep = raw.includes(";") ? ";" : ",";
  return raw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

const required = (v: string) => v.trim().length > 0 || "Required.";
const atLeastOne = (v: string) => parseList(v).length > 0 || "Give at least one.";

export async function runIntake(): Promise<IntakeAnswers> {
  console.log(chalk.bold("\nRamoira — draft a brand schema\n"));
  console.log(
    chalk.gray(
      "Answer a few questions. Your own model drafts a candidate from them; you judge a few\n" +
        "sample lines; nothing becomes your brand's measure until you ratify it.\n",
    ),
  );

  const answeredBy = await select<AnswerRole>({
    message: "Who is answering?",
    choices: [
      { name: "Brand owner", value: "brand_owner" },
      { name: "Brand team", value: "brand_team" },
      { name: "Agency, on the brand's behalf", value: "agency" },
      { name: "Freelancer, on the brand's behalf", value: "freelancer" },
    ],
  });

  const brandName = await input({ message: "Brand name:", validate: required });
  const brandId = await input({
    message: "Brand ID (URL-safe slug):",
    default: slugify(brandName),
    validate: (v) => /^[a-z0-9][a-z0-9-]*$/.test(v) || "Lowercase letters, numbers and hyphens.",
  });

  console.log(chalk.gray("  e.g. 'Carbon-steel frying pans for home cooks'"));
  const categoryDescriptor = await input({ message: "What do you make, and for whom?", validate: required });

  console.log(chalk.gray("  e.g. 'A pan is not finished when you buy it. You finish it by cooking.'"));
  const mythStatement = await input({ message: "What does your brand believe about the world?", validate: required });

  const foundedRaw = await input({ message: "Year founded (optional):" });

  console.log(chalk.gray("  e.g. plain-spoken, practical, quietly proud"));
  const approvedTones = parseList(await input({ message: "How should you sound? (comma-separated)", validate: atLeastOne }));

  console.log(chalk.gray("  e.g. hype, jargon, guilt-tripping"));
  const avoidTones = parseList(await input({ message: "How must you never sound? (comma-separated)", validate: atLeastOne }));

  console.log(chalk.gray("  e.g. never use fear about other products; never promise effortlessness"));
  const neverDo = parseList(
    await input({ message: "What must your brand never do? (separate with ;)", validate: atLeastOne }),
  );

  console.log(chalk.gray("  Exact words or phrases. e.g. non-toxic, chemical-free"));
  const forbiddenWords = parseList(await input({ message: "Words never to use (optional, comma-separated):" }));

  console.log(chalk.gray("  Facts you can stand behind. e.g. Spun from 2 mm carbon steel; 25-year warranty"));
  const claims = parseList(await input({ message: "Product claims you can make (optional, separate with ;):" }));

  const competitors = parseList(await input({ message: "Competitors never to name (optional, comma-separated):" }));

  const surfaces = await checkbox<string>({
    message: "Where does your content appear?",
    choices: OUTPUT_SURFACES.map((s) => ({ value: s, name: surfaceLabel(s), checked: DEFAULT_SURFACES.includes(s) })),
    validate: (chosen) => chosen.length > 0 || "Choose at least one.",
  });

  const pricingStyle = await select({ message: "How does your brand talk about money?", choices: PRICING_STYLES });

  return {
    answeredBy,
    brandName: brandName.trim(),
    brandId,
    categoryDescriptor: categoryDescriptor.trim(),
    mythStatement: mythStatement.trim(),
    founded: foundedRaw.trim() || null,
    approvedTones,
    avoidTones,
    neverDo,
    forbiddenWords,
    claims,
    competitors,
    surfaces,
    pricingStyle,
  };
}
