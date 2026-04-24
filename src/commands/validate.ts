import chalk from "chalk";
import { validateSchema } from "../lib/validator.js";
import { readJsonFile } from "../lib/files.js";

interface ValidateOptions {
  summary?: boolean;
}

export async function validateCommand(
  file: string | undefined,
  options: ValidateOptions,
): Promise<void> {
  const filePath = file ?? "brand.schema.json";

  let schema: unknown;
  try {
    schema = readJsonFile(filePath);
  } catch (err) {
    console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
    process.exit(1);
  }

  if (options.summary) {
    console.log(chalk.yellow("Summary schema validation not yet implemented. Coming soon."));
    process.exit(0);
  }

  const result = validateSchema(schema);

  if (result.valid) {
    console.log(chalk.green(`✓ ${filePath} is valid.`));
    process.exit(0);
  } else {
    console.log(chalk.red(`✗ ${filePath} failed validation:\n`));
    result.errors.forEach((e) => console.log(chalk.red(`  · ${e}`)));
    process.exit(1);
  }
}
