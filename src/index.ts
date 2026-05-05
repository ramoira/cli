import { Command } from "commander";
import { createRequire } from "module";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { publishCommand } from "./commands/publish.js";
import { statusCommand } from "./commands/status.js";
import { loginCommand, logoutCommand, whoamiCommand } from "./lib/auth.js";
import { bookCommand } from "./commands/book.js";
// import { enrichCommand } from "./commands/enrich.js";
import { createTokenCommand } from "./commands/create-token.js";
import { DEFAULT_SCHEMA_PATH } from "./lib/files.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");


const program = new Command();

program
  .name("ramoira")
  .description("Brand schema generation and publishing for the agent web")
  .version(version);

program
  .command("init")
  .description("Generate a brand.schema.json in the current directory")
  .option("-o, --output <path>", "Output file path", DEFAULT_SCHEMA_PATH)
  .action(initCommand);

program
  .command("validate [file]")
  .description("Validate a brand schema against the Ramoira spec")
  .option("--summary", "Validate against the summary schema instead")
  .action(validateCommand);

program
  .command("publish [file]")
  .description("Publish brand schema to ramoira.com")
  .action(publishCommand);

program
  .command("status [slug]")
  .description("Show current publication state for a brand")
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
  .description("Generate a brand book HTML from a brand schema")
  .option("-o, --out <path>", "Output file path (default: <brandId>-brand-book.html)")
  .action(bookCommand);

// enrich command — pending platform component PATCH API (roadmap)
// program
//   .command("enrich")
//   .description("Add voice variants, pillars, and full governance to an existing schema")
//   .option("-f, --file <path>", "Schema file path", DEFAULT_SCHEMA_PATH)
//   .option("--url <url>", "Fetch brand context from a URL (repeatable)", collect, [])
//   .option("--context <file>", "Load brand context from a .txt or .md file (repeatable)", collect, [])
//   .action(enrichCommand);

program.parse();
