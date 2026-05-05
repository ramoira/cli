import chalk from "chalk";
import ora from "ora";
import { input } from "@inquirer/prompts";
import { resolve } from "path";
import { runIntake } from "../lib/intake.js";
import { generateSchema, resolveApiKey, saveApiKey } from "../lib/generator.js";
import { validateSchema } from "../lib/validator.js";
import { writeJsonFile, writeTextFile, fileExists, AGENTS_MD_PATH } from "../lib/files.js";
import { generateAgentsMd } from "../lib/agents-md.js";
import { confirm } from "@inquirer/prompts";

interface InitOptions {
  output: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const outputPath = options.output;

  // Check for existing file
  if (fileExists(outputPath)) {
    const overwrite = await confirm({
      message: `${outputPath} already exists. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      console.log(chalk.gray("Aborted."));
      process.exit(0);
    }
  }

  // Resolve API key
  let apiKey = resolveApiKey();
  if (!apiKey) {
    console.log(chalk.yellow("\nANTHROPIC_API_KEY not set in environment."));
    apiKey = await input({
      message: "Enter your Anthropic API key:",
    });
    if (!apiKey.trim()) {
      console.error(chalk.red("API key required. Set ANTHROPIC_API_KEY and try again."));
      process.exit(1);
    }
    saveApiKey(apiKey);
    console.log(chalk.gray("  API key saved to ~/.ramoira/config.json"));
  }

  // Run intake questions
  const intake = await runIntake();

  // Generate schema via LLM
  const spinner = ora("Initializing schema generation…").start();

  let schema: Record<string, unknown>;
  try {
    schema = await generateSchema(intake, apiKey, {
      onStatus: (message: string) => {
        spinner.text = message;
      },
    });
    spinner.succeed("Schema generated successfully.");
  } catch (err) {
    spinner.fail("Generation failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }

  // Validate (repair + retry already ran inside generateSchema)
  const result = validateSchema(schema);
  if (!result.valid) {
    console.log(chalk.yellow("\nSchema has residual validation issues after auto-repair:"));
    result.errors.slice(0, 10).forEach((e) => console.log(chalk.yellow(`  · ${e}`)));
    if (result.errors.length > 10) {
      console.log(chalk.yellow(`  … and ${result.errors.length - 10} more`));
    }
    console.log(chalk.gray("  Run ramoira validate after editing to re-check."));
    const save = await confirm({
      message: "Save anyway?",
      default: true,
    });
    if (!save) {
      console.log(chalk.gray("Aborted."));
      process.exit(0);
    }
  } else {
    console.log(chalk.green("✓ Schema validates against Ramoira spec."));
  }

  // Write schema
  const absPath = resolve(outputPath);
  writeJsonFile(outputPath, schema);
  console.log(chalk.bold(`\n✓ Saved to ${absPath}`));

  // Write agents.md
  try {
    const md = generateAgentsMd(schema);
    writeTextFile(AGENTS_MD_PATH, md);
    console.log(chalk.gray(`✓ agents.md written to ${resolve(AGENTS_MD_PATH)}`));
  } catch {
    // Non-fatal — schema may be incomplete
  }

  printPreview(schema);
}

function printPreview(schema: Record<string, unknown>): void {
  const identity = schema.identity as Record<string, unknown> | undefined;
  const narrative = schema.narrative as Record<string, unknown> | undefined;
  const voice = schema.voice as Record<string, unknown> | undefined;

  const summary = identity?.summary as Record<string, unknown> | undefined;
  const prism = identity?.prism as Record<string, unknown> | undefined;
  const personality = prism?.personality as Record<string, unknown> | undefined;
  const linguistic = (identity?.distinctiveAssets as Record<string, unknown> | undefined)?.linguistic as Record<string, unknown> | undefined;

  const brandName = (schema.meta as Record<string, unknown> | undefined)?.brandName as string | undefined;
  const adjectives = summary?.threeAdjectives as string[] | undefined;
  const myth = (narrative?.myth as Record<string, unknown> | undefined)?.mythStatement as string | undefined;
  const culturalTension = (narrative?.myth as Record<string, unknown> | undefined)?.culturalTension as string | undefined;
  const examples = voice?.examples as Array<Record<string, unknown>> | undefined;
  const approved = examples?.find((e) => e.verdict === "approved");
  const rejected = examples?.find((e) => e.verdict === "rejected");
  const ownedPhrases = linguistic?.ownedPhrases as Array<Record<string, unknown>> | undefined;
  const forbiddenWords = linguistic?.forbiddenWords as Array<Record<string, unknown>> | undefined;

  const width = 58;
  const rule = chalk.gray("  " + "╌".repeat(width));

  console.log();
  console.log(rule);
  console.log();

  // Brand name + adjectives
  if (brandName) {
    const adj = adjectives?.length ? chalk.gray("  ·  ") + chalk.dim(adjectives.join("  ·  ")) : "";
    console.log("  " + chalk.bold(brandName) + adj);
  }

  // Myth
  if (myth) {
    console.log();
    wrapText(myth, width - 2).forEach((line) => console.log("  " + chalk.italic(chalk.white(line))));
  }

  // Cultural tension
  if (culturalTension) {
    console.log();
    console.log("  " + chalk.gray("The conflict your brand takes a side on:"));
    wrapText(culturalTension, width - 4).forEach((line) => console.log("    " + chalk.dim(line)));
  }

  // Personality scores
  if (personality) {
    const scores: [string, string][] = [
      ["Sincerity",      "sincerity"],
      ["Excitement",     "excitement"],
      ["Competence",     "competence"],
      ["Sophistication", "sophistication"],
      ["Ruggedness",     "ruggedness"],
    ];
    const hasAny = scores.some(([, k]) => typeof personality[k] === "number");
    if (hasAny) {
      console.log();
      console.log("  " + chalk.gray("Personality"));
      scores.forEach(([label, key]) => {
        const val = personality[key];
        if (typeof val !== "number") return;
        const filled = Math.round(val);
        const bar = chalk.cyan("█".repeat(filled)) + chalk.gray("░".repeat(10 - filled));
        console.log(`  ${label.padEnd(14)} ${bar}  ${val}`);
      });
    }
  }

  // Voice examples
  if (approved || rejected) {
    console.log();
    console.log("  " + chalk.gray("Voice"));
    if (approved) {
      const ctx = ((approved.context as string) ?? "").replace(/_/g, " ");
      const text = ((approved.text as string) ?? "").slice(0, 120);
      console.log("  " + chalk.green("✓") + " " + chalk.dim(text) + (ctx ? chalk.gray(`  — ${ctx}`) : ""));
    }
    if (rejected) {
      const reason = ((rejected.reason as string) ?? "").slice(0, 80);
      const text = ((rejected.text as string) ?? "").slice(0, 120);
      console.log("  " + chalk.red("✗") + " " + chalk.dim(text) + (reason ? chalk.gray(`  — ${reason}`) : ""));
    }
  }

  // Owned phrases + forbidden words
  const phrases = ownedPhrases?.slice(0, 3).map((p) => `"${p.value}"`).join("  ·  ");
  const forbidden = forbiddenWords?.slice(0, 3).map((p) => `"${p.value}"`).join("  ·  ");
  if (phrases || forbidden) {
    console.log();
    if (phrases) console.log("  " + chalk.gray("Own:       ") + chalk.dim(phrases));
    if (forbidden) console.log("  " + chalk.gray("Never say: ") + chalk.dim(forbidden));
  }

  console.log();
  console.log(rule);
  console.log();

  // Review prompts
  console.log("  " + chalk.yellow("⚠  Review before publishing:"));
  console.log(chalk.gray("     claims        — functionalClaims and approvedClaims are agent-generated"));
  console.log(chalk.gray("     visual        — colors and photography style need your actual assets"));
  console.log(chalk.gray("     commercial    — discount rules and pricing language"));
  console.log();

  // Next steps
  console.log(chalk.gray("  ramoira enrich   — add voice variants, pillars, full governance (~60s)"));
  console.log(chalk.gray("  ramoira book     — generate the full visual brand book"));
  console.log(chalk.gray("  ramoira publish  — publish to ramoira.com (requires account)"));
  console.log();
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
