import { Command } from "commander";
import { createRequire } from "module";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { publishCommand } from "./commands/publish.js";
import { statusCommand } from "./commands/status.js";
import { loginCommand, logoutCommand, whoamiCommand } from "./lib/auth.js";
import { bookCommand } from "./commands/book.js";
import { createTokenCommand } from "./commands/create-token.js";
import { DEFAULT_SCHEMA_PATH } from "./lib/files.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");


const program = new Command();

program
  .name("ramoira")
  .description("Draft, validate and publish an open brand schema")
  .version(version);

program
  .command("init")
  .description("Draft a candidate 3.0.0 brand schema from a short questionnaire, with your own model key")
  .option("-o, --output <path>", "Output file path", DEFAULT_SCHEMA_PATH)
  .option("--anchored", "Draft from the archetype library (free hosted service; not available yet)")
  .option("--no-probes", "Skip judging sample lines; judged rules become guidance questions")
  .action(initCommand);

program
  .command("validate [file]")
  .description("Check that a file is a well-formed schema (full, summary, archetype, or a verdict record)")
  .action(validateCommand);

program
  .command("publish [file]")
  .description("Publish brand schema to ramoira.com")
  .action(publishCommand);

program
  .command("status [slug]")
  .description("Show what is true for a brand: published, ratified, checked")
  .action(statusCommand);

program
  .command("login")
  .description("Authenticate via GitHub (or use --manual to paste a token)")
  .option("--manual", "Skip browser flow and paste a token directly")
  .action(loginCommand);

program
  .command("logout")
  .description("Remove saved API token")
  .action(logoutCommand);

program
  .command("whoami")
  .description("Show the currently authenticated account")
  .action(whoamiCommand);

program
  .command("create-token [label]")
  .description("Create a named API token for CI/CD use")
  .action(createTokenCommand);

program
  .command("book [file]")
  .description("Render a brand book (HTML) from a 3.0.0 schema; --probe to judge sample lines first")
  .option("-o, --out <path>", "Output file path (default: <brandId>-brand-book.html)")
  .option("--probe", "Judge model-drafted sample lines; the ones you mark become examples in your schema")
  .action(bookCommand);

program.parse();
