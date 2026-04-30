import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { publishCommand } from "./commands/publish.js";
import { statusCommand } from "./commands/status.js";
import { loginCommand, logoutCommand, whoamiCommand } from "./lib/auth.js";
import { bookCommand } from "./commands/book.js";

const program = new Command();

program
  .name("ramoira")
  .description("Brand schema generation and publishing for the agent web")
  .version("0.1.0");

program
  .command("init")
  .description("Generate a brand.schema.json in the current directory")
  .option("-o, --output <path>", "Output file path", "brand.schema.json")
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
  .description("Save API token for publish and status commands")
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
  .command("book [file]")
  .description("Generate a brand book HTML from a brand schema")
  .option("-o, --out <path>", "Output file path (default: <brandId>-brand-book.html)")
  .action(bookCommand);

program.parse();
