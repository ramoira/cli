import chalk from "chalk";
import ora from "ora";
import { input } from "@inquirer/prompts";
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
  writeJsonFile(outputPath, schema);
  console.log(chalk.bold(`\n✓ Saved to ${outputPath}`));
  console.log(chalk.gray("\nNext steps:"));
  console.log(chalk.gray("  ramoira validate        — re-validate at any time"));
  console.log(chalk.gray("  ramoira publish         — publish to ramoira.com (requires account)"));
}
