import chalk from "chalk";
import { validateSchema } from "../lib/validator.js";
import { readJsonFile, DEFAULT_SCHEMA_PATH } from "../lib/files.js";

const MIGRATION_GUIDE =
  "https://github.com/ramoira/brand-schema-spec/blob/main/migrations/2.0.0-to-3.0.0.md";

export async function validateCommand(file: string | undefined): Promise<void> {
  const filePath = file ?? DEFAULT_SCHEMA_PATH;

  let doc: unknown;
  try {
    doc = readJsonFile(filePath);
  } catch (err) {
    console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
    process.exit(1);
  }

  const result = validateSchema(doc);
  const isV3 = result.specVersion?.startsWith("3.") ?? false;
  const what =
    isV3
      ? `${result.specVersion} ${result.kind} schema`
      : result.specVersion === "2.0.0"
        ? "2.0.0 schema"
        : "schema";

  if (result.valid) {
    console.log(chalk.green(`✓ ${filePath} is a valid ${what}.`));
  } else {
    console.log(chalk.red(`✗ ${filePath} is not a valid ${what}:\n`));
  }

  for (const issue of result.issues) {
    const tag = issue.invariant ? chalk.gray(` [invariant ${issue.invariant}]`) : "";
    const line = `  · ${issue.path} ${issue.message}${tag}`;
    console.log(issue.level === "error" ? chalk.red(line) : chalk.yellow(line));
  }

  if (result.specVersion === "2.0.0") {
    console.log(chalk.yellow("\n  2.0.0 is superseded by 3.0.0. Migration guide:"));
    console.log(chalk.gray(`  ${MIGRATION_GUIDE}`));
  }

  console.log(
    chalk.gray(
      "\n  This checks that the file is a well-formed schema. It does not check any content against it.",
    ),
  );
  if (isV3 && result.kind !== "record" && result.kind !== "adoption") {
    const ratified = Boolean((doc as { ramoira?: { ratification?: unknown } }).ramoira?.ratification);
    console.log(
      chalk.gray(
        ratified
          ? "  Carries a ratification pointer. Ramoira's record is the authority; see `ramoira status`."
          : "  Candidate — not ratified.",
      ),
    );
  }

  process.exit(result.valid ? 0 : 1);
}
