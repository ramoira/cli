import chalk from "chalk";
import { DEFAULT_SCHEMA_PATH, readJsonFile, writeJsonFile } from "../lib/files.js";
import { computeContentHash } from "../lib/validator.js";

// `ramoira hash`: the schema's content_hash (spec §4.1), the fingerprint of
// its meaning. --write puts it into ramoira.content_hash, which every edit to
// the meaning makes stale.

export async function hashCommand(file: string | undefined, options: { write?: boolean }): Promise<void> {
  const filePath = file ?? DEFAULT_SCHEMA_PATH;
  let doc: Record<string, any>;
  try {
    doc = readJsonFile(filePath) as Record<string, any>;
  } catch (err) {
    console.error(chalk.red(`Cannot read ${filePath}: ${(err as Error).message}`));
    process.exit(1);
  }
  if (!doc || typeof doc !== "object" || !doc.ramoira || typeof doc.ramoira !== "object") {
    console.error(chalk.red(`${filePath} is not a 3.x schema: it has no ramoira block.`));
    process.exit(1);
  }
  const hash = computeContentHash(doc);
  if (!options.write) {
    console.log(hash);
    if (doc.ramoira.content_hash !== hash) console.error(chalk.yellow("The file's content_hash is stale. Run: ramoira hash --write"));
    return;
  }
  if (doc.ramoira.content_hash === hash) {
    console.log(chalk.gray(`Unchanged: ${hash}`));
    return;
  }
  doc.ramoira.content_hash = hash;
  writeJsonFile(filePath, doc);
  console.log(chalk.green(`✓ content_hash ${hash}`));
}
