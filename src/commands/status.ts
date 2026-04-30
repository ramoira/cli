import chalk from "chalk";
import ora from "ora";
import { fetchStatus } from "../lib/api.js";
import { readConfig } from "../lib/config.js";
import { readJsonFile, fileExists, DEFAULT_SCHEMA_PATH } from "../lib/files.js";

interface StatusOptions {
  //
}

export async function statusCommand(
  slug: string | undefined,
  _options: StatusOptions,
): Promise<void> {
  // Resolve slug: arg > config file > schema file
  let resolvedSlug = slug;

  if (!resolvedSlug) {
    resolvedSlug = readConfig().brandSlug;
  }

  if (!resolvedSlug && fileExists(DEFAULT_SCHEMA_PATH)) {
    try {
      const schema = readJsonFile(DEFAULT_SCHEMA_PATH) as Record<string, unknown>;
      const meta = schema.meta as Record<string, unknown> | undefined;
      resolvedSlug = meta?.brandId as string | undefined;
    } catch {
      // ignore
    }
  }

  if (!resolvedSlug) {
    console.error(
      chalk.red(
        "Brand slug required. Pass it as an argument, or run from a directory with brand.schema.json.",
      ),
    );
    process.exit(1);
  }

  const spinner = ora(`Checking status for ${resolvedSlug}…`).start();
  try {
    const res = await fetchStatus(resolvedSlug);
    spinner.stop();

    const stateColor =
      res.workflowState === "published"
        ? chalk.green
        : res.workflowState === "in_review"
          ? chalk.yellow
          : chalk.gray;

    console.log(`\n  Brand:    ${chalk.bold(resolvedSlug)}`);
    console.log(`  State:    ${stateColor(res.workflowState)}`);
    console.log(`  Certified: ${res.certified ? chalk.green("yes") : chalk.gray("no")}`);
    if (res.confidence > 0) {
      console.log(`  Confidence: ${res.confidence}`);
    }
    if (res.canonicalUrl) {
      console.log(`  URL:      ${chalk.cyan(res.canonicalUrl)}`);
    }
    console.log();
  } catch (err) {
    spinner.fail("Status check failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}
