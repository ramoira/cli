import chalk from "chalk";
import ora from "ora";
import { ApiError, pushProposal } from "../lib/api.js";
import { getToken } from "../lib/config.js";
import { DEFAULT_SCHEMA_PATH, readJsonFile, writeJsonFile } from "../lib/files.js";
import { planPush } from "../lib/push-plan.js";
import { readSync, writeSync } from "../lib/sync.js";

// `ramoira push` (roadmap C4, D20): uploads the schema as a private, proposed
// version, like pushing a branch. Anyone holding the credential may push: the
// person, their agent, or CI with RAMOIRA_TOKEN. Nothing becomes public: the
// owner reviews it on ramoira.com, signed in, and only they make it public.

export async function pushCommand(file: string | undefined, options: { slug?: string }): Promise<void> {
  const filePath = file ?? DEFAULT_SCHEMA_PATH;
  let schema: Record<string, any>;
  try {
    schema = readJsonFile(filePath) as Record<string, any>;
  } catch (err) {
    console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
    process.exit(1);
  }

  const sync = readSync();
  const plan = planPush(schema, options.slug ?? sync.brand);
  if (!plan.ok) {
    console.error(chalk.red(plan.message));
    plan.details?.forEach((d) => console.error(chalk.red(`  · ${d}`)));
    process.exit(1);
  }
  if (!getToken()) {
    console.error(chalk.red("Not signed in. Run: ramoira login (free), or set RAMOIRA_TOKEN."));
    process.exit(1);
  }

  if (plan.setsBrandId) {
    // brand_id sits outside content_hash, so the fingerprint is unchanged.
    schema.ramoira.brand_id = plan.slug;
    writeJsonFile(filePath, schema);
    console.log(chalk.gray(`  Set ramoira.brand_id to "${plan.slug}" in ${filePath}.`));
  }

  const spinner = ora(`Pushing ${plan.slug} ${plan.schemaVersion}…`).start();
  try {
    const res = await pushProposal(plan.slug, schema, sync.base);
    writeSync({ brand: plan.slug, base: sync.base, pushed: res.content_hash });
    spinner.succeed(res.unchanged ? "Already pushed: this exact version is waiting for review." : "Pushed. Nothing is public.");
    if (res.claimed) console.log(chalk.gray(`  The slug "${plan.slug}" is now yours. It is never given to anyone else.`));
    console.log(chalk.bold(`\n  The owner reviews it here, signed in: ${res.review_url}`));
    console.log(chalk.gray(`  Version ${plan.schemaVersion} · ${res.content_hash.slice(0, 19)}…`));
    console.log(chalk.gray("\n  Candidate — not ratified. In the review the owner affirms, edits or deletes each rule,"));
    console.log(chalk.gray("  then makes the version public or sends it back. After that: ramoira pull."));
  } catch (err) {
    if (err instanceof ApiError && err.body?.code === "stale_base") {
      spinner.fail("Out of date: the owner has reviewed a newer version than the one this file is based on.");
      console.error(chalk.yellow("  Run ramoira pull, then make your changes again on top of it."));
      process.exit(1);
    }
    spinner.fail("Push failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}
