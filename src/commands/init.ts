import chalk from "chalk";
import ora from "ora";
import { confirm, input } from "@inquirer/prompts";
import { createRequire } from "module";
import { resolve } from "path";
import { runIntake } from "../lib/intake.js";
import { draftCandidate } from "../lib/draft.js";
import { assembleCandidate, resolveJudgedRules, type PendingJudgedRule } from "../lib/assemble.js";
import { applyJudgments, draftRuleProbes } from "../lib/probes.js";
import { judgeProbes } from "../lib/judge-ui.js";
import { resolveApiKey, saveApiKey } from "../lib/api-key.js";
import { validateSchema } from "../lib/validator.js";
import { writeJsonFile, writeTextFile, fileExists, AGENTS_MD_PATH } from "../lib/files.js";
import { generateAgentsMd } from "../lib/agents-md.js";
import { getApiBase, readConfig, writeConfig } from "../lib/config.js";
import { sessionIsLive, sessionUrl, startAnchoredSession, waitForCandidate } from "../lib/anchored.js";

// `ramoira init` (roadmap C1, C2; decisions D7, D8). Offline path: the
// questionnaire, the user's own model, no Ramoira account. Writes a complete
// five-layer 3.0.0 candidate. Archetype-anchored drafting (`--anchored`) is a
// free hosted service, without an account or a model key (D7, D18): this CLI
// opens the session in the browser and saves the 3.1.0 candidate it returns.
// The templates never ship in this CLI.

interface InitOptions {
  output: string;
  anchored?: boolean;
  probes?: boolean;
}

type Obj = Record<string, any>;

const MAX_PROBED_RULES = 5;
const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

export async function initCommand(options: InitOptions): Promise<void> {
  const outputPath = options.output;
  if (fileExists(outputPath)) {
    const overwrite = await confirm({ message: `${outputPath} already exists. Overwrite?`, default: false });
    if (!overwrite) {
      console.log(chalk.gray("Aborted."));
      process.exit(0);
    }
  }

  if (options.anchored) {
    await anchoredInit(outputPath);
    return;
  }

  let apiKey = resolveApiKey();
  if (!apiKey) {
    console.log(chalk.yellow("\nANTHROPIC_API_KEY not set. init drafts with your own model key."));
    apiKey = (await input({ message: "Enter your Anthropic API key:" })).trim();
    if (!apiKey) {
      console.error(chalk.red("API key required. Set ANTHROPIC_API_KEY and try again."));
      process.exit(1);
    }
    saveApiKey(apiKey);
    console.log(chalk.gray("  API key saved to ~/.ramoira/config.json"));
  }

  const intake = await runIntake();

  const spinner = ora("Drafting your candidate schema (this can take a minute or two)…").start();
  let assembled;
  try {
    assembled = assembleCandidate(intake, await draftCandidate(intake, apiKey), version);
    spinner.succeed("Candidate drafted.");
  } catch (err) {
    spinner.fail("Drafting failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }

  const interactive = options.probes !== false && process.stdin.isTTY === true;
  const settled = interactive
    ? await probeJudgedRules(assembled.schema, assembled.pending, intake.surfaces, intake.answeredBy, apiKey)
    : resolveJudgedRules(assembled.schema, assembled.pending, {});
  const schema = settled.schema;

  const result = validateSchema(schema);
  if (!result.valid) {
    console.log(chalk.yellow("\nThe candidate has validation issues:"));
    result.errors.slice(0, 10).forEach((e) => console.log(chalk.yellow(`  · ${e}`)));
    const save = await confirm({ message: "Save anyway?", default: true });
    if (!save) {
      console.log(chalk.gray("Aborted."));
      process.exit(0);
    }
  } else {
    console.log(chalk.green("\n✓ Valid 3.0.0 schema."));
  }

  save(outputPath, schema);
  printPreview(schema, settled.kept.length, settled.toGuidance.length);
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
      console.log(chalk.gray("  Run ramoira init without --anchored to draft from the questionnaire."));
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
  console.log(chalk.gray("\n  Next: ramoira validate · ramoira book · ramoira publish\n"));
}

async function probeJudgedRules(
  schema: Obj,
  pending: PendingJudgedRule[],
  surfaces: string[],
  role: Parameters<typeof applyJudgments>[2],
  apiKey: string,
): Promise<ReturnType<typeof resolveJudgedRules>> {
  if (pending.length === 0) return resolveJudgedRules(schema, pending, {});

  const probed = pending.slice(0, MAX_PROBED_RULES);
  console.log(chalk.bold(`\nJudge a few sample lines (${probed.length * 2})`));
  console.log(
    chalk.gray(
      "  Some proposed rules need judgment to check. For each, your model drafts two lines.\n" +
        "  They are probes, not content: only you see them. Your verdicts become the examples\n" +
        "  those rules are checked against. A rule you can't back with a \"That's us\" and a\n" +
        "  \"Not us\" becomes a guidance question instead.\n",
    ),
  );

  const spinner = ora("Drafting probes…").start();
  let probes;
  try {
    probes = await draftRuleProbes(schema, probed, surfaces, apiKey);
    spinner.stop();
  } catch (err) {
    spinner.warn(`Could not draft probes (${(err as Error).message}). Judged rules become guidance questions.`);
    return resolveJudgedRules(schema, pending, {});
  }

  const judgments = await judgeProbes(probes);
  const { schema: withExamples, byJudgment } = applyJudgments(schema, judgments, role);
  const examplesByRule: Record<string, string[]> = {};
  judgments.forEach((j, i) => {
    const id = byJudgment[i];
    if (id) (examplesByRule[j.probe.rule_id] ??= []).push(id);
  });
  return resolveJudgedRules(withExamples, pending, examplesByRule);
}

function printPreview(schema: Obj, kept: number, toGuidance: number): void {
  const name: string = schema.draft_provenance?.intake?.name ?? schema.ramoira.brand_id;
  const myth: string | undefined = schema.narrative?.myth?.mythStatement;
  const tension: string | undefined = schema.narrative?.myth?.culturalTension;
  const rules: Obj[] = schema.rules ?? [];
  const unaffirmed = rules.filter((r) => r.affirmed === false).length;
  const judgedExamples = (schema.voice?.examples ?? []).filter((e: Obj) => ["brand_owner", "brand_team"].includes(e.judged_by)).length;
  const unfilled = Object.entries(schema.draft_provenance?.fields ?? {})
    .filter(([, status]) => status === "unfilled")
    .map(([p]) => p.split("/").pop());

  const rule = chalk.gray("  " + "╌".repeat(58));
  console.log(`\n${rule}\n`);
  console.log("  " + chalk.yellow("Candidate — not ratified"));
  console.log(chalk.gray("  Drafted by your model from your answers. It becomes your brand's measure"));
  console.log(chalk.gray("  only when the brand reviews and ratifies it.\n"));
  console.log("  " + chalk.bold(name));
  if (myth) console.log("  " + chalk.italic(myth));
  if (tension) console.log("\n  " + chalk.gray("The conflict your brand takes a side on: ") + chalk.dim(tension));
  console.log();
  console.log(`  Rules             ${rules.length}${unaffirmed ? chalk.gray(` (${unaffirmed} proposed by the model, not yet affirmed)`) : ""}`);
  console.log(`  Judged rules      ${kept} backed by your examples${toGuidance ? chalk.gray(`, ${toGuidance} kept as guidance questions`) : ""}`);
  console.log(`  Your examples     ${judgedExamples}`);
  if (unfilled.length) console.log(`  Left for you      ${chalk.gray(unfilled.join(", "))}`);
  console.log(`\n${rule}`);
  console.log(chalk.gray("\n  Next: edit ramoira/brand.schema.json, then ramoira validate · ramoira book\n"));
}
