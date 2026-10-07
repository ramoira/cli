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

// `ramoira init` (roadmap C1, C2; decisions D7, D8). Offline path: the
// questionnaire, the user's own model, no Ramoira account. Writes a complete
// five-layer 3.0.0 candidate. Archetype-anchored drafting (`--anchored`) is a
// free hosted service and never ships in this CLI.

interface InitOptions {
  output: string;
  anchored?: boolean;
  probes?: boolean;
}

type Obj = Record<string, any>;

const MAX_PROBED_RULES = 5;
const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

export async function initCommand(options: InitOptions): Promise<void> {
  if (options.anchored) {
    console.log(chalk.yellow("Archetype-anchored drafting is a free, hosted Ramoira service. It is not available yet."));
    console.log(chalk.gray("  Run ramoira init without --anchored to draft from the questionnaire."));
    process.exit(1);
  }

  const outputPath = options.output;
  if (fileExists(outputPath)) {
    const overwrite = await confirm({ message: `${outputPath} already exists. Overwrite?`, default: false });
    if (!overwrite) {
      console.log(chalk.gray("Aborted."));
      process.exit(0);
    }
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

  writeJsonFile(outputPath, schema);
  console.log(chalk.bold(`✓ Saved to ${resolve(outputPath)}`));
  try {
    writeTextFile(AGENTS_MD_PATH, generateAgentsMd(schema));
    console.log(chalk.gray(`✓ agents.md written to ${resolve(AGENTS_MD_PATH)}`));
  } catch {
    // Non-fatal: agents.md is a convenience.
  }

  printPreview(schema, settled.kept.length, settled.toGuidance.length);
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
