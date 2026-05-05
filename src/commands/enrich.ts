import chalk from "chalk";
import ora from "ora";
import { resolve } from "path";
import { enrichSchema, resolveApiKey } from "../lib/generator.js";
import { validateSchema } from "../lib/validator.js";
import { readJsonFile, writeJsonFile, fileExists, DEFAULT_SCHEMA_PATH } from "../lib/files.js";
import { gatherContext, MAX_WORDS_TOTAL, type ContextSource } from "../lib/context.js";
import { input } from "@inquirer/prompts";

interface EnrichOptions {
  file: string;
  url?: string[];
  context?: string[];
}

export async function enrichCommand(options: EnrichOptions): Promise<void> {
  const filePath = options.file ?? DEFAULT_SCHEMA_PATH;

  if (!fileExists(filePath)) {
    console.error(chalk.red(`Schema not found: ${resolve(filePath)}`));
    console.error(chalk.gray("Run  ramoira init  first."));
    process.exit(1);
  }

  let existing: Record<string, unknown>;
  try {
    existing = readJsonFile(filePath) as Record<string, unknown>;
  } catch {
    console.error(chalk.red(`Could not read ${filePath} — is it valid JSON?`));
    process.exit(1);
  }

  let apiKey = resolveApiKey();
  if (!apiKey) {
    console.log(chalk.yellow("\nANTHROPIC_API_KEY not set in environment."));
    apiKey = await input({ message: "Enter your Anthropic API key:" });
    if (!apiKey.trim()) {
      console.error(chalk.red("API key required."));
      process.exit(1);
    }
  }

  // Gather context from URLs and files
  const sources: ContextSource[] = [
    ...(options.url ?? []).map((u) => ({ type: "url" as const, value: u })),
    ...(options.context ?? []).map((f) => ({ type: "file" as const, value: f })),
  ];

  let brandContext: string | undefined;

  if (sources.length) {
    const contextSpinner = ora("Reading brand context…").start();
    try {
      const gathered = await gatherContext(sources);
      brandContext = gathered.text;
      contextSpinner.succeed(`Context loaded — ${gathered.totalWords.toLocaleString()} words passed to Claude.`);

      gathered.sources.forEach((s) => {
        const truncNote = s.truncated ? chalk.yellow(" (truncated at per-source limit)") : "";
        console.log(chalk.gray(`  ↳ ${s.label}  ${s.words.toLocaleString()} words`) + truncNote);
      });

      if (gathered.truncated) {
        console.log();
        console.log(chalk.yellow(`  ⚠  Total context exceeds ${MAX_WORDS_TOTAL.toLocaleString()} words — content was trimmed.`));
        console.log(chalk.gray("     Split into multiple passes for best results:"));
        console.log(chalk.gray("       ramoira enrich --url https://yourbrand.com"));
        console.log(chalk.gray("       ramoira enrich --context detailed-guidelines.md"));
        console.log();
      }
    } catch (err) {
      contextSpinner.fail("Failed to load context.");
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  } else {
    console.log(chalk.gray("\nNo context sources provided — enriching from schema only."));
    console.log(chalk.gray("Tip: pass --url https://yourbrand.com or --context brief.md for better results.\n"));
  }

  const spinner = ora("Enriching schema…").start();

  let schema: Record<string, unknown>;
  try {
    schema = await enrichSchema(existing, apiKey, {
      onStatus: (msg) => { spinner.text = msg; },
    }, brandContext);
    spinner.succeed("Schema enriched.");
  } catch (err) {
    spinner.fail("Enrichment failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }

  const result = validateSchema(schema);
  if (!result.valid) {
    console.log(chalk.yellow("\nResidual validation issues:"));
    result.errors.slice(0, 10).forEach((e) => console.log(chalk.yellow(`  · ${e}`)));
    console.log(chalk.gray("  Run  ramoira validate  to re-check after editing."));
  } else {
    console.log(chalk.green("✓ Schema validates against Ramoira spec."));
  }

  writeJsonFile(filePath, schema);
  console.log(chalk.bold(`\n✓ Saved to ${resolve(filePath)}`));
  console.log();
  console.log(chalk.gray("  ramoira book     — generate the full visual brand book"));
  console.log(chalk.gray("  ramoira publish  — publish to ramoira.com"));
  console.log();
}
