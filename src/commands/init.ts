import chalk from "chalk";
import ora from "ora";
import { input } from "@inquirer/prompts";
import { resolve } from "path";
import { runIntake } from "../lib/intake.js";
import { generateSchema, resolveApiKey } from "../lib/generator.js";
import { validateSchema } from "../lib/validator.js";
import { writeJsonFile, fileExists } from "../lib/files.js";
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

  // Write file
  const absPath = resolve(outputPath);
  writeJsonFile(outputPath, schema);
  console.log(chalk.bold(`\n✓ Saved to ${absPath}`));

  // Aha moment — surface myth + one voice example so the user sees real output immediately
  printPreview(schema);

  console.log(chalk.gray("\nNext steps:"));
  console.log(chalk.gray("  ramoira validate        — re-validate at any time"));
  console.log(chalk.gray("  ramoira book            — generate the full visual brand book"));
  console.log(chalk.gray("  ramoira publish         — publish to ramoira.com (requires account)"));
}

function printPreview(schema: Record<string, unknown>): void {
  const identity = schema.identity as Record<string, unknown> | undefined;
  const narrative = schema.narrative as Record<string, unknown> | undefined;
  const voice = schema.voice as Record<string, unknown> | undefined;

  const summary = identity?.summary as Record<string, unknown> | undefined;
  const brandName = (schema.meta as Record<string, unknown> | undefined)?.brandName as string | undefined;
  const adjectives = summary?.threeAdjectives as string[] | undefined;
  const myth = (narrative?.myth as Record<string, unknown> | undefined)?.mythStatement as string | undefined;
  const examples = voice?.examples as Array<Record<string, unknown>> | undefined;
  const approved = examples?.find((e) => e.verdict === "approved");

  if (!myth && !approved) return;

  const width = 56;
  const rule = chalk.gray("  " + "╌".repeat(width));

  console.log();
  console.log(rule);

  if (brandName) {
    const adjectiveLine = adjectives?.length
      ? chalk.gray("  · ") + chalk.dim(adjectives.join("  ·  "))
      : "";
    console.log("  " + chalk.bold(brandName) + (adjectiveLine ? "  " + adjectiveLine : ""));
  }

  if (myth) {
    console.log();
    const wrapped = wrapText(myth, width - 2);
    wrapped.forEach((line) => console.log("  " + chalk.italic(chalk.white(line))));
  }

  if (approved) {
    console.log();
    const surface = ((approved.context as string) ?? "").replace(/_/g, " ");
    if (surface) console.log("  " + chalk.gray(`↳ ${surface}`));
    const preview = ((approved.text as string) ?? "").slice(0, 160);
    const wrapped = wrapText(preview + (preview.length < (approved.text as string).length ? "…" : ""), width - 2);
    wrapped.forEach((line) => console.log("  " + chalk.dim(line)));
  }

  console.log();
  console.log(rule);
  console.log();
  console.log("  " + chalk.cyan("Run  ramoira book  to generate the full visual brand book."));
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
