import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import ora from "ora";
import { fetchReviewed, type ReviewBrief } from "../lib/api.js";
import { getToken } from "../lib/config.js";
import { DEFAULT_SCHEMA_PATH, RAMOIRA_DIR, readJsonFile, writeJsonFile, writeTextFile } from "../lib/files.js";
import { readSync, writeSync } from "../lib/sync.js";
import { computeContentHash } from "../lib/validator.js";

// `ramoira pull` (roadmap D20): brings down the last version the owner
// reviewed, and their brief when they sent it back. The brief holds only the
// owner's own requests and decisions, never Ramoira's suggestions (RMT1);
// the person's agent makes the changes.

export const BRIEF_PATH = `${RAMOIRA_DIR}/REVIEW.md`;

/** The owner's brief, as the agent reads it. */
export function briefMarkdown(brief: ReviewBrief, slug: string, hash: string): string {
  const lines = [
    `# Review brief: ${slug}`,
    "",
    `The owner reviewed version \`${hash.slice(0, 19)}…\` and sent it back. These are the owner's own words.`,
    "Make these changes in `ramoira/brand.schema.json`, following `ramoira/DRAFTING.md`, then validate and, when the person asks, push.",
    "",
  ];
  if (brief.requests.length) {
    lines.push("## Requests", "");
    for (const r of brief.requests) lines.push(`- ${r.path ? `\`${r.path}\`: ` : ""}${r.text}`);
    lines.push("");
  }
  if (brief.decisions.length) {
    lines.push("## What the owner decided", "");
    for (const d of brief.decisions) {
      const what = d.rule_id ? `rule \`${d.rule_id}\`` : d.path ? `\`${d.path}\`` : "";
      lines.push(`- ${d.kind}${what ? ` ${what}` : ""}${d.note ? `: "${d.note}"` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export async function pullCommand(file: string | undefined, options: { slug?: string; force?: boolean }): Promise<void> {
  const filePath = file ?? DEFAULT_SCHEMA_PATH;
  const sync = readSync();
  let local: Record<string, any> | null = null;
  if (existsSync(resolve(filePath))) {
    try {
      local = readJsonFile(filePath) as Record<string, any>;
    } catch (err) {
      console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
      process.exit(1);
    }
  }
  const slug = options.slug ?? sync.brand ?? local?.ramoira?.brand_id ?? null;
  if (!slug) {
    console.error(chalk.red("Name the brand: ramoira pull --slug your-brand"));
    process.exit(1);
  }
  if (!getToken()) {
    console.error(chalk.red("Not signed in. Run: ramoira login (free), or set RAMOIRA_TOKEN."));
    process.exit(1);
  }

  const spinner = ora(`Pulling ${slug}…`).start();
  let reviewed;
  try {
    reviewed = await fetchReviewed(slug);
  } catch (err) {
    spinner.fail("Pull failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
  if (!reviewed) {
    spinner.info(`Nothing reviewed yet for ${slug}. The owner reviews pushed versions on ramoira.com.`);
    return;
  }

  // Like git: never overwrite work that was neither reviewed nor pushed.
  if (local && !options.force) {
    const hash = local.ramoira && typeof local.ramoira === "object" ? computeContentHash(local) : null;
    const known = [sync.base, sync.pushed, reviewed.content_hash];
    if (hash && !known.includes(hash)) {
      spinner.fail(`${filePath} has changes that were never pushed.`);
      console.error(chalk.yellow("  Push them first (ramoira push), or replace them with ramoira pull --force."));
      process.exit(1);
    }
  }

  writeJsonFile(filePath, reviewed.schema);
  writeSync({ brand: slug, base: reviewed.content_hash, pushed: sync.pushed });
  if (reviewed.brief && (reviewed.brief.requests.length || reviewed.brief.decisions.length)) {
    writeTextFile(BRIEF_PATH, briefMarkdown(reviewed.brief, slug, reviewed.content_hash));
    spinner.succeed(`Pulled the reviewed version. The owner sent it back: their brief is in ${BRIEF_PATH}.`);
  } else {
    if (existsSync(resolve(BRIEF_PATH))) unlinkSync(resolve(BRIEF_PATH));
    spinner.succeed(reviewed.state === "public" ? "Pulled the reviewed version. The owner made it public." : "Pulled the reviewed version.");
  }
  console.log(chalk.gray(`  ${reviewed.content_hash.slice(0, 19)}… · reviewed ${reviewed.reviewed_at.slice(0, 10)}`));
}
