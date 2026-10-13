import chalk from "chalk";
import ora from "ora";
import { confirm } from "@inquirer/prompts";
import { resolve } from "path";
import { validateSchema } from "../lib/validator.js";
import { writeJsonFile, writeTextFile, fileExists, AGENTS_MD_PATH } from "../lib/files.js";
import { generateAgentsMd } from "../lib/agents-md.js";
import { getApiBase, readConfig, writeConfig } from "../lib/config.js";
import { sessionIsLive, sessionUrl, startAnchoredSession, waitForCandidate } from "../lib/anchored.js";
import { DRAFTING_PATH, DRAFTING_VERSION, SPEC_DIR, SPEC_VERSION, installDrafting, installReadme } from "../lib/drafting.js";
import { README_PATH } from "../lib/readme.js";

// `ramoira init` (roadmap C1, D20). By default it sets the project up for
// the person's own coding agent: it installs the drafting protocol
// (ramoira/DRAFTING.md, the copy pinned in this CLI) and points the project's
// agent instruction files at it. The agent then drafts the schema; no
// account, no Ramoira model. With --anchored, the person drafts from
// reference brands in the browser instead (D7, D18), and this CLI saves the
// candidate the hosted session returns. The templates never ship here.

interface InitOptions {
  output: string;
  anchored?: boolean;
}

type Obj = Record<string, any>;

export async function initCommand(options: InitOptions): Promise<void> {
  if (options.anchored) {
    const outputPath = options.output;
    if (fileExists(outputPath)) {
      const overwrite = await confirm({ message: `${outputPath} already exists. Overwrite?`, default: false });
      if (!overwrite) {
        console.log(chalk.gray("Aborted."));
        process.exit(0);
      }
    }
    await anchoredInit(outputPath);
    return;
  }

  const result = installDrafting();
  console.log("");
  const spec = result.steps.filter((st) => st.path.startsWith(`${SPEC_DIR}/`));
  if (spec.length) {
    const changed = spec.some((st) => st.outcome !== "unchanged");
    console.log(`  ${changed ? chalk.green("✓") : chalk.gray("·")} ${SPEC_DIR}/ (spec ${SPEC_VERSION}, local copy) ${chalk.gray(`— ${changed ? "written" : "already current"}`)}`);
  }
  for (const step of result.steps.filter((st) => !st.path.startsWith(`${SPEC_DIR}/`))) {
    const label =
      step.path === DRAFTING_PATH
        ? `${step.path} (drafting protocol ${DRAFTING_VERSION})`
        : step.path === README_PATH
          ? `${step.path} (for you: draft, review, make public)`
          : step.path;
    const note =
      step.outcome === "kept"
        ? "yours, left as it is"
        : step.path === README_PATH
          ? step.outcome === "unchanged"
            ? "already current"
            : step.outcome
          : step.path === DRAFTING_PATH
        ? step.outcome === "unchanged"
          ? "already current"
          : result.replacedVersion
            ? `replaced version ${result.replacedVersion}`
            : step.outcome
        : step.outcome === "unchanged"
          ? "already points to it"
          : step.outcome === "created"
            ? "created, with a brand schema section"
            : "brand schema section added";
    console.log(`  ${step.outcome === "unchanged" || step.outcome === "kept" ? chalk.gray("·") : chalk.green("✓")} ${label} ${chalk.gray(`— ${note}`)}`);
  }
  if (result.claudeMdMissing) {
    console.log(chalk.gray("  · Using Claude Code? It reads CLAUDE.md: add a line there saying @AGENTS.md."));
  }
  console.log("");
  console.log(chalk.bold("  Now ask your coding agent:"));
  console.log("  " + chalk.cyan('"Read ramoira/DRAFTING.md and draft our brand schema."'));
  console.log("");
  console.log(chalk.gray("  It reads your project and anything you give it, asks what it can't find, and writes"));
  console.log(chalk.gray("  ramoira/brand.schema.json: a candidate. You review every rule on ramoira.com before"));
  console.log(chalk.gray("  anything is public. No coding agent? Draft in the browser: ramoira init --anchored"));
  console.log(chalk.gray(`  The whole flow, from draft to public and on to the next version: ${README_PATH}`));
  console.log("");
}

function save(outputPath: string, schema: Obj): void {
  writeJsonFile(outputPath, schema);
  console.log(chalk.bold(`✓ Saved to ${resolve(outputPath)}`));
  try {
    writeTextFile(AGENTS_MD_PATH, generateAgentsMd(schema));
    console.log(chalk.gray(`✓ agents.md written to ${resolve(AGENTS_MD_PATH)}`));
  } catch {
    // Non-fatal: agents.md is a convenience.
  }
  if (installReadme().some((st) => st.outcome === "created" || st.outcome === "updated")) {
    console.log(chalk.gray(`✓ ${README_PATH}: what happens next, step by step`));
  }
}

async function anchoredInit(outputPath: string): Promise<void> {
  const base = getApiBase();
  const config = readConfig();
  let token = config.draftToken;
  if (token && (await sessionIsLive(base, token))) {
    const resume = await confirm({ message: "Continue the drafting session you started earlier?", default: true });
    if (!resume) token = undefined;
  } else token = undefined;

  if (!token) {
    try {
      token = (await startAnchoredSession(base)).token;
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      console.log(chalk.gray("  Or draft with your coding agent: run ramoira init without --anchored."));
      process.exit(1);
    }
    writeConfig({ ...readConfig(), draftToken: token });
  }

  const url = sessionUrl(base, token);
  console.log("");
  console.log(chalk.bold("  Draft in your browser (free, no account):"));
  console.log("  " + chalk.cyan(url));
  console.log(chalk.gray("  About twenty minutes. You can close this terminal and run ramoira init --anchored again to continue."));
  console.log("");
  try {
    const { default: open } = await import("open");
    await open(url);
  } catch {
    // The URL is printed.
  }

  const spinner = ora("Waiting for you to finish in the browser…").start();
  const onSigint = () => {
    spinner.stop();
    console.log(chalk.gray("\n  Stopped waiting. The session is kept: run ramoira init --anchored to continue."));
    process.exit(0);
  };
  process.on("SIGINT", onSigint);
  const poll = await waitForCandidate(base, token, {
    onStep: (step) => (spinner.text = `Waiting for you to finish in the browser… (now at: ${step.replace("_", " ")})`),
  });
  process.off("SIGINT", onSigint);

  if (!poll) {
    spinner.warn("Still not finished. The session is kept: run ramoira init --anchored to continue.");
    process.exit(0);
  }
  if (poll.state !== "done") {
    spinner.fail(poll.state === "gone" ? poll.message : "The session did not finish.");
    writeConfig({ ...readConfig(), draftToken: undefined });
    process.exit(1);
  }
  spinner.succeed("Session finished.");

  const schema = poll.schema as Obj;
  const result = validateSchema(schema);
  if (!result.valid) {
    console.log(chalk.yellow("\nThe candidate has validation issues:"));
    result.errors.slice(0, 10).forEach((e) => console.log(chalk.yellow(`  · ${e}`)));
  } else {
    console.log(chalk.green(`\n✓ Valid ${result.specVersion} schema.`));
  }
  save(outputPath, schema);
  writeConfig({ ...readConfig(), draftToken: undefined });
  printAnchoredPreview(schema);
}

function printAnchoredPreview(schema: Obj): void {
  const p: Obj = schema.draft_provenance ?? {};
  const rules: Obj[] = schema.rules ?? [];
  const unaffirmed = rules.filter((r) => r.affirmed === false).length;
  const own = (schema.voice?.examples ?? []).filter((e: Obj) => e.source === "owner_reaction").length;
  const statuses = Object.values(p.fields ?? {}) as string[];
  const count = (s: string) => statuses.filter((x) => x === s).length;
  const rule = chalk.gray("  " + "╌".repeat(58));
  console.log(`\n${rule}\n`);
  console.log("  " + chalk.yellow("Candidate — not ratified"));
  console.log(chalk.gray("  Assembled from the starting reference and your answers; nothing was written for you."));
  console.log(chalk.gray("  It becomes your brand's measure only when the brand reviews and ratifies it.\n"));
  console.log("  " + chalk.bold(p.intake?.name ?? schema.ramoira.brand_id));
  if (p.anchors?.[0]) console.log("  " + chalk.gray(`Starting reference: ${p.anchors[0].archetype_id}`));
  console.log();
  console.log(`  Rules             ${rules.length}${unaffirmed ? chalk.gray(` (${unaffirmed} kept from the template, not yet affirmed)`) : ""}`);
  console.log(`  Your examples     ${own}`);
  console.log(`  Fields            ${count("authored")} in your words, ${count("affirmed")} affirmed, ${count("unfilled")} left for you`);
  console.log(`\n${rule}`);
  console.log(chalk.gray("\n  Next: ramoira validate · ramoira push (the owner then reviews it on ramoira.com)\n"));
}
