import chalk from "chalk";
import ora from "ora";
import { writeFileSync } from "fs";
import { readJsonFile } from "../lib/files.js";
import { generateBook } from "../lib/api.js";
import { getToken } from "../lib/config.js";

interface BookOptions {
  out?: string;
}

export async function bookCommand(
  file: string | undefined,
  options: BookOptions,
): Promise<void> {
  const filePath = file ?? "brand.schema.json";

  if (!getToken()) {
    console.error(
      chalk.red("Not authenticated. Set RAMOIRA_TOKEN or run: ramoira login"),
    );
    process.exit(1);
  }

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
    console.error(chalk.red("Schema must have a meta.brandId field."));
    process.exit(1);
  }

  const outPath = options.out ?? `${slug}-brand-book.html`;

  const spinner = ora("Generating brand book…").start();
  try {
    const html = await generateBook(slug, schemaObj);
    writeFileSync(outPath, html, "utf-8");
    spinner.succeed("Brand book generated.");
    console.log(chalk.bold(`\n✓ ${outPath}`));
    console.log(chalk.gray("  Open in any browser. Print to PDF for sharing."));
  } catch (err) {
    spinner.fail("Brand book generation failed.");
    console.error(chalk.red((err as Error).message));
    process.exit(1);
  }
}
