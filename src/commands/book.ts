import chalk from "chalk";
import ora from "ora";
import { confirm, select } from "@inquirer/prompts";
import { writeFileSync, mkdirSync } from "fs";
import { readJsonFile, writeJsonFile, DEFAULT_SCHEMA_PATH, RAMOIRA_DIR } from "../lib/files.js";
import { isV2Schema, validateSchema } from "../lib/validator.js";
import { anchorArchetypeId, brandJudgedExamples, buildBookContent } from "../lib/book-content.js";
import { getTheme, resolveArchetypeKey } from "../lib/book-archetypes.js";
import { renderBrandBook } from "../lib/book-renderer.js";
import { applyJudgments, draftProbes, type JudgeRole } from "../lib/probes.js";
import { resolveApiKey } from "../lib/api-key.js";
import { judgeProbes } from "../lib/judge-ui.js";

interface BookOptions {
  out?: string;
  probe?: boolean;
}

const DEFAULT_PROBE_SURFACES = ["product_detail_page", "social_organic", "email_acquisition"];

export async function bookCommand(file: string | undefined, options: BookOptions): Promise<void> {
  const filePath = file ?? DEFAULT_SCHEMA_PATH;

  let schema: Record<string, any>;
  try {
    schema = readJsonFile(filePath) as Record<string, any>;
  } catch (err) {
    console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
    process.exit(1);
  }

  if (isV2Schema(schema)) {
    console.error(chalk.red("ramoira book needs a 3.0.0 schema. This file is 2.0.0."));
    console.error(
      chalk.gray("  Migration guide: https://github.com/ramoira/brand-schema-spec/blob/main/migrations/2.0.0-to-3.0.0.md"),
    );
    process.exit(1);
  }
  const checked = validateSchema(schema);
  if (!checked.valid || checked.kind !== "full") {
    console.error(chalk.red(`${filePath} is not a valid 3.0.0 full schema. Run: ramoira validate ${filePath}`));
    process.exit(1);
  }

  if (options.probe) {
    schema = await runProbeSession(schema, filePath);
  } else if (brandJudgedExamples(schema).length === 0) {
    console.log(chalk.yellow("No brand-judged examples yet, so the book will have none."));
    console.log(chalk.gray("  Run ramoira book --probe to judge sample lines; the ones you mark go into the book."));
  }

  const slug = String(schema.ramoira.brand_id ?? "brand");
  const outPath = options.out ?? `${RAMOIRA_DIR}/${slug}-brand-book.html`;
  const html = renderBrandBook(buildBookContent(schema), getTheme(resolveArchetypeKey(anchorArchetypeId(schema))), filePath);
  mkdirSync(RAMOIRA_DIR, { recursive: true });
  writeFileSync(outPath, html, "utf-8");

  console.log(chalk.bold(`\n✓ ${outPath}`));
  console.log(chalk.gray(`  ${schema.ramoira.ratification ? "Ratified schema." : "Candidate — not ratified."} Open in any browser; print to PDF to share.`));
}

async function runProbeSession(schema: Record<string, any>, filePath: string): Promise<Record<string, any>> {
  if (!process.stdin.isTTY) {
    console.error(chalk.red("--probe is interactive: run it in a terminal."));
    process.exit(1);
  }
  if (schema.ramoira.ratification) {
    console.error(chalk.red("This schema is ratified. Adding examples would change it; edit a copy and ratify again."));
    process.exit(1);
  }
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(chalk.red("--probe drafts sample lines with your own model key. Set ANTHROPIC_API_KEY."));
    process.exit(1);
  }

  console.log(chalk.bold("\nProbe session"));
  console.log(
    chalk.gray(
      "  A model drafts sample lines. They are not content: only you see them.\n" +
        "  Mark each one. Lines you mark \"that's us\" or \"not us\" become examples in your schema.\n",
    ),
  );

  const role = await select<JudgeRole>({
    message: "Who is judging?",
    choices: [
      { name: "Brand owner", value: "brand_owner" },
      { name: "Brand team", value: "brand_team" },
      { name: "Agency (recorded, but cannot ground checks or appear in the book)", value: "agency" },
      { name: "Freelancer (recorded, but cannot ground checks or appear in the book)", value: "freelancer" },
    ],
  });

  const variantSurfaces = (schema.voice.contextVariants ?? []).map((v: { surface: string }) => v.surface);
  const surfaces = (variantSurfaces.length ? variantSurfaces : DEFAULT_PROBE_SURFACES).slice(0, 4);

  const spinner = ora("Drafting probes…").start();
  let probes;
  try {
    probes = await draftProbes(schema, surfaces, apiKey);
    spinner.stop();
  } catch (err) {
    spinner.fail("Could not draft probes.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }

  const judgments = await judgeProbes(probes);

  if (judgments.length === 0) {
    console.log(chalk.gray("\nNo judgments recorded."));
    return schema;
  }

  const { schema: next, exampleIds } = applyJudgments(schema, judgments, role);
  const result = validateSchema(next);
  if (!result.valid) {
    console.error(chalk.red("The updated schema did not validate; nothing was written:"));
    result.errors.forEach((e) => console.error(chalk.red(`  · ${e}`)));
    process.exit(1);
  }

  const save = await confirm({
    message: `Add ${exampleIds.length} example(s) and ${judgments.length} reaction(s) to ${filePath}?`,
    default: true,
  });
  if (!save) return schema;
  writeJsonFile(filePath, next);
  console.log(chalk.green(`✓ ${filePath} updated (new content_hash ${String(next.ramoira.content_hash).slice(0, 19)}…).`));
  return next;
}
