import chalk from "chalk";
import ora from "ora";
import { fetchReviewed, fetchStatus } from "../lib/api.js";
import { fileStanding, statusLines } from "../lib/status-view.js";
import { getToken, readConfig } from "../lib/config.js";
import { readSync } from "../lib/sync.js";
import { computeContentHash } from "../lib/validator.js";
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
    resolvedSlug = readSync().brand ?? readConfig().brandSlug;
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
    const standing = await projectStanding(resolvedSlug, res);
    if (standing) {
      console.log(`\n  ${standing.label.padEnd(13)} ${paint[standing.tone](standing.value)}`);
    }
    console.log();
  } catch (err) {
    spinner.fail("Status check failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}

/** This project's file against the public version and, with the owner's credential, the reviewed one. */
async function projectStanding(slug: string, res: Awaited<ReturnType<typeof fetchStatus>>) {
  if (!fileExists(DEFAULT_SCHEMA_PATH)) return null;
  let local: string | null = null;
  try {
    const doc = readJsonFile(DEFAULT_SCHEMA_PATH) as Record<string, any>;
    if (doc?.ramoira?.brand_id && doc.ramoira.brand_id !== slug) return null;
    local = doc?.ramoira ? computeContentHash(doc) : null;
  } catch {
    return null;
  }
  let reviewed: { hash: string; state: "public" | "reviewed" } | null = null;
  if (getToken()) {
    try {
      const r = await fetchReviewed(slug);
      if (r) reviewed = { hash: r.content_hash, state: r.state };
    } catch {
      // Not this account's brand, or offline: compare with the public version only.
    }
  }
  return fileStanding({
    local,
    publicHash: res.published?.content_hash ?? null,
    publicVersion: res.published?.schema_version ?? null,
    reviewed,
    sync: readSync(),
  });
}
