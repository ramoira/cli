import chalk from "chalk";
import { readFileSync } from "fs";
import { basename } from "path";
import { CheckError, checkItem } from "@ramoira/schema/checker";
import type { CheckResult, ProducerClass } from "@ramoira/schema/checker";
import { readJsonFile, DEFAULT_SCHEMA_PATH } from "../lib/files.js";
import { isV2Schema } from "../lib/validator.js";
import { OUTPUT_SURFACES } from "../lib/surfaces.js";
import { resolveApiKey } from "../lib/api-key.js";
import { anthropicJudge } from "../lib/judge.js";
import { exitCode, headerLines, resultLines, type Line, type Tone } from "../lib/check-view.js";

// `ramoira check` (roadmap C10): the open checker, free, no account. Checks
// content items against the brand's schema and reports what the schema's own
// rules find. The options are facts about the item and who is checking; none
// of them chooses, skips or tunes rules (RMT4). Results are tooling_only.

interface CheckOptions {
  surface?: string;
  market?: string;
  schema?: string;
  producer?: string;
  producerClass?: string;
  brand?: boolean;
  json?: boolean;
}

const PRODUCER_CLASSES = ["agency", "freelancer", "internal_team", "in_house_ai", "other"];

const paint: Record<Tone, (s: string) => string> = {
  fail: chalk.red,
  review: chalk.yellow,
  log: chalk.cyan,
  muted: chalk.gray,
  ok: chalk.green,
  plain: (s) => s,
};

function usage(message: string): never {
  console.error(chalk.red(message));
  process.exit(3);
}

async function readItems(paths: string[]): Promise<Array<{ name: string; text: string }>> {
  if (paths.length === 0 || (paths.length === 1 && paths[0] === "-")) {
    if (process.stdin.isTTY) usage("Give one or more files to check, or pipe an item in: ramoira check --surface <surface> <file…>");
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return [{ name: "stdin", text: Buffer.concat(chunks).toString("utf8") }];
  }
  return paths.map((p) => {
    try {
      return { name: basename(p), text: readFileSync(p, "utf8") };
    } catch (err) {
      usage(`Cannot read ${p}: ${(err as Error).message}`);
    }
  });
}

export async function checkCommand(files: string[], options: CheckOptions): Promise<void> {
  if (!options.surface) usage(`--surface is required: where the item will appear. One of:\n  ${OUTPUT_SURFACES.join(", ")}`);
  if (!OUTPUT_SURFACES.includes(options.surface)) usage(`Unknown surface "${options.surface}". One of:\n  ${OUTPUT_SURFACES.join(", ")}`);
  const producerClass = options.producerClass ?? "other";
  if (!PRODUCER_CLASSES.includes(producerClass)) usage(`--producer-class must be one of: ${PRODUCER_CLASSES.join(", ")}`);

  const schemaPath = options.schema ?? DEFAULT_SCHEMA_PATH;
  let schema: Record<string, any>;
  try {
    schema = readJsonFile(schemaPath) as Record<string, any>;
  } catch (err) {
    usage(`Cannot read ${schemaPath}: ${(err as Error).message}`);
  }
  if (isV2Schema(schema)) {
    usage(
      `${schemaPath} is a 2.0.0 schema; ramoira check needs 3.0.0.\n  Migration guide: https://github.com/ramoira/brand-schema-spec/blob/main/migrations/2.0.0-to-3.0.0.md`,
    );
  }

  const items = await readItems(files);
  const apiKey = resolveApiKey();
  const judge = apiKey ? anthropicJudge(apiKey) : null;
  const mode = options.brand ? "principal_commissioned" : "producer_self_check";

  const results: Array<{ name: string; result: CheckResult }> = [];
  for (const item of items) {
    try {
      const result = await checkItem(
        schema,
        { text: item.text, surface: options.surface, market: options.market ?? null },
        {
          commissioning_mode: mode,
          producer: { producer_id: options.producer ?? "unattributed", producer_class: producerClass as ProducerClass },
          judge,
        },
      );
      results.push({ name: item.name, result });
    } catch (err) {
      if (err instanceof CheckError) usage(`${schemaPath}: ${err.message}`);
      throw err;
    }
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        results.map(({ name, result }) => ({ source: name, ...result })),
        null,
        2,
      ),
    );
  } else {
    const print = (l: Line) => console.log(paint[l.tone](l.text));
    console.log();
    headerLines(schema, options.surface, mode, Boolean(judge)).forEach(print);
    for (const { name, result } of results) {
      console.log();
      resultLines(name, result, schema).forEach(print);
    }
    console.log(
      chalk.gray(
        `\n  ${mode === "principal_commissioned" ? "A check you run yourself is for your own review" : "A self-check is useful tooling"}, not an independent check.\n  Ramoira flags and cites; it does not suggest rewrites.\n`,
      ),
    );
  }
  process.exit(exitCode(results.map((r) => r.result)));
}
