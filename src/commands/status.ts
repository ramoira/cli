import chalk from "chalk";
import ora from "ora";
import { fetchStatus } from "../lib/api.js";
import { statusLines } from "../lib/status-view.js";
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
      const meta = schema.meta as Record<string, unknown> | undefined; // 2.0.0
      const ramoira = schema.ramoira as Record<string, unknown> | undefined; // 3.0.0
      resolvedSlug = (ramoira?.brand_id ?? meta?.brandId) as string | undefined;
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

    const paint = { good: chalk.green, neutral: chalk.white, muted: chalk.gray };
    console.log();
    for (const line of statusLines(resolvedSlug, res)) {
      console.log(`  ${line.label.padEnd(13)} ${paint[line.tone](line.value)}`);
    }
    console.log(chalk.gray("\n  Facts only. Nothing here is a quality or trust score."));
    console.log();
  } catch (err) {
    spinner.fail("Status check failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}
