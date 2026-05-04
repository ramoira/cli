import chalk from "chalk";
import ora from "ora";
import { validateSchema } from "../lib/validator.js";
import { readJsonFile, writeTextFile, DEFAULT_SCHEMA_PATH, AGENTS_MD_PATH } from "../lib/files.js";
import { generateAgentsMd } from "../lib/agents-md.js";
import { publishSchema } from "../lib/api.js";
import { getToken } from "../lib/config.js";

interface PublishOptions {
  //
}

export async function publishCommand(
  file: string | undefined,
  _options: PublishOptions,
): Promise<void> {
  const filePath = file ?? DEFAULT_SCHEMA_PATH;

  // Check auth first
  if (!getToken()) {
    console.error(
      chalk.red("Not authenticated. Set RAMOIRA_TOKEN or run: ramoira login"),
    );
    process.exit(1);
  }

  // Read schema
  let schema: unknown;
  try {
    schema = readJsonFile(filePath);
  } catch (err) {
    console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
    process.exit(1);
  }

  // Validate locally
  const result = validateSchema(schema);
  if (!result.valid) {
    console.log(chalk.red(`✗ ${filePath} failed validation:\n`));
    result.errors.forEach((e) => console.log(chalk.red(`  · ${e}`)));
    console.log(chalk.yellow("\nFix validation errors before publishing."));
    process.exit(1);
  }
  console.log(chalk.green(`✓ Schema valid.`));

  // Extract slug from schema meta
  const schemaObj = schema as Record<string, unknown>;
  const meta = schemaObj.meta as Record<string, unknown> | undefined;
  const slug = meta?.brandId as string | undefined;
  if (!slug) {
    console.error(chalk.red("Cannot determine brand slug. Schema must have a meta.brandId field."));
    process.exit(1);
  }

  // Publish
  const spinner = ora(`Publishing to ramoira.com/brands/${slug}…`).start();
  try {
    const res = await publishSchema(slug, schemaObj);
    spinner.succeed("Published.");
    console.log(chalk.bold(`\n✓ Published to ${res.canonicalUrl}`));
    console.log(chalk.gray(`  Version: ${res.versionId}`));
    console.log(chalk.gray(`  State:   ${res.workflowState}`));
    if (!res.certified) {
      console.log(chalk.gray("\n  Certification is available for Studio tier accounts."));
    }

    // Refresh agents.md with canonical URL
    try {
      const md = generateAgentsMd(schemaObj, res.canonicalUrl);
      writeTextFile(AGENTS_MD_PATH, md);
      console.log(chalk.gray(`\n✓ agents.md updated with canonical URL`));
    } catch {
      // Non-fatal
    }
  } catch (err) {
    spinner.fail("Publish failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}
