import chalk from "chalk";
import ora from "ora";
import { writeFileSync, mkdirSync } from "fs";
import { readJsonFile, DEFAULT_SCHEMA_PATH, RAMOIRA_DIR } from "../lib/files.js";
import { generateBrandBook } from "../lib/book-generator.js";
import { resolveApiKey } from "../lib/generator.js";

interface BookOptions {
  out?: string;
}

export async function bookCommand(
  file: string | undefined,
  options: BookOptions,
): Promise<void> {
  const filePath = file ?? DEFAULT_SCHEMA_PATH;

  // Read schema
  let schema: unknown;
  try {
    schema = readJsonFile(filePath);
  } catch (err) {
    console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
    process.exit(1);
  }

  const schemaObj = schema as Record<string, unknown>;
  const meta = schemaObj.meta as Record<string, unknown> | undefined;
  const slug = meta?.brandId as string | undefined;

  if (!slug) {
    console.error(chalk.red("Schema must have a meta.brandId field. Run ramoira init first."));
    process.exit(1);
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(chalk.red("ANTHROPIC_API_KEY is not set."));
    console.error(chalk.gray("  export ANTHROPIC_API_KEY=sk-ant-..."));
    process.exit(1);
  }

  const outPath = options.out ?? `${RAMOIRA_DIR}/${slug}-brand-book.html`;

  const spinner = ora("Generating brand book…").start();
  try {
    const html = await generateBrandBook(schemaObj, apiKey, filePath);
    mkdirSync(RAMOIRA_DIR, { recursive: true });
    writeFileSync(outPath, html, "utf-8");
    spinner.succeed("Brand book generated.");
    console.log(chalk.bold(`\n✓ ${outPath}`));
    console.log(chalk.gray("  Open in any browser. Print to PDF for sharing."));
    console.log(chalk.blueBright("\n⭐ Love Ramoira? Star the open-source project on GitHub:"));
    console.log(chalk.blueBright("   https://github.com/ramoira/cli\n"));
  } catch (err) {
    spinner.fail("Brand book generation failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}
