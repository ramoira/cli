import chalk from "chalk";
import ora from "ora";
import { readJsonFile, DEFAULT_SCHEMA_PATH } from "../lib/files.js";
import { publishSchema } from "../lib/api.js";
import { getToken } from "../lib/config.js";
import { planPublish } from "../lib/publish-plan.js";

// `ramoira publish` (roadmap C4): free; needs a free account only so the slug
// belongs to whoever owns it. Sends the full 3.0.0 schema; Ramoira keeps it
// private and serves the public summary at the slug.

export async function publishCommand(file: string | undefined): Promise<void> {
  const filePath = file ?? DEFAULT_SCHEMA_PATH;

  let schema: unknown;
  try {
    schema = readJsonFile(filePath);
  } catch (err) {
    console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
    process.exit(1);
  }

  const plan = planPublish(schema);
  if (!plan.ok) {
    console.error(chalk.red(plan.message));
    plan.details?.forEach((d) => console.error(chalk.red(`  · ${d}`)));
    process.exit(1);
  }

  if (!getToken()) {
    console.error(chalk.red("Not signed in. Run: ramoira login (free), or set RAMOIRA_TOKEN."));
    process.exit(1);
  }

  const spinner = ora(`Publishing ${plan.slug} ${plan.schemaVersion}…`).start();
  try {
    const res = await publishSchema(plan.slug, schema as Record<string, unknown>);
    spinner.succeed(res.unchanged ? "Already published: this exact version is current." : "Published.");
    if (res.claimed) console.log(chalk.gray(`  The slug "${plan.slug}" is now yours. It is never given to anyone else.`));
    console.log(chalk.bold(`\n  Public summary: ${res.canonicalUrl}`));
    console.log(chalk.gray(`  Version: ${plan.schemaVersion} · ${plan.contentHash.slice(0, 19)}…`));
    console.log(chalk.gray("\n  Candidate — not ratified. Publishing does not ratify the schema; your full schema stays private."));
  } catch (err) {
    spinner.fail("Publish failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}
