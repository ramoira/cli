import { Command } from "commander";
import { createRequire } from "module";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { publishCommand } from "./commands/publish.js";
import { hashCommand } from "./commands/hash.js";
import { pushCommand } from "./commands/push.js";
import { pullCommand } from "./commands/pull.js";
import { statusCommand } from "./commands/status.js";
import { loginCommand, logoutCommand, whoamiCommand } from "./lib/auth.js";
import { bookCommand } from "./commands/book.js";
import { checkCommand } from "./commands/check.js";
import { createTokenCommand } from "./commands/create-token.js";
import { DEFAULT_SCHEMA_PATH } from "./lib/files.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");


const program = new Command();

program
  .name("ramoira")
  .description("Draft, validate and share an open brand schema")
  .version(version);

program
  .command("init")
  .description("Set the project up for your coding agent to draft the brand schema (installs ramoira/DRAFTING.md); no account")
  .option("--anchored", "Draft from reference brands in your browser instead: free hosted Ramoira service, no account, no model key")
  .option("-o, --output <path>", "With --anchored: where to save the schema", DEFAULT_SCHEMA_PATH)
  .action(initCommand);

program
  .command("hash [file]")
  .description("Print the schema's content_hash; --write puts it into the file (run after every edit)")
  .option("-w, --write", "Write the content_hash into ramoira.content_hash")
  .action(hashCommand);

program
  .command("validate [file]")
  .description("Check that a file is a well-formed schema (full, summary, archetype, or a verdict record)")
  .action(validateCommand);

program
  .command("check [items...]")
  .description("Check content against your brand schema's rules (free, no account); judged rules use your own model key")
  .option("-s, --surface <surface>", "Where the item will appear (required; e.g. product_detail_page, social_organic)")
  .option("-m, --market <code>", "The market the item is for; rules scoped to markets need it")
  .option("--schema <path>", "Schema to check against", DEFAULT_SCHEMA_PATH)
  .option("--producer <id>", "Who produced the item")
  .option("--producer-class <class>", "agency, freelancer, internal_team, in_house_ai or other", "other")
  .option("--brand", "You are the brand, checking a producer's work for your own review")
  .option("--json", "Print verdict events as JSON (no colour), for CI")
  .action(checkCommand);

program
  .command("push [file]")
  .description("Upload the schema as a private version for the owner to review on ramoira.com (free account); nothing becomes public")
  .option("--slug <slug>", "The brand's slug, when ramoira.brand_id is not set")
  .action(pushCommand);

program
  .command("pull [file]")
  .description("Bring down the version the owner reviewed, and their brief if they sent it back (ramoira/REVIEW.md)")
  .option("--slug <slug>", "The brand's slug, when the project does not name it yet")
  .option("--force", "Replace local changes that were never pushed")
  .action(pullCommand);

program
  .command("publish", { hidden: true })
  .description("Replaced by push: the owner publishes on ramoira.com")
  .action(publishCommand);

program
  .command("status [slug]")
  .description("Show what is true for a brand (published, ratified, checked) and whether this project's file is behind")
  .action(statusCommand);

program
  .command("login")
  .description("Sign in through your browser, with GitHub or an emailed link (free); replaces this computer's earlier token. --manual pastes a token")
  .option("--manual", "Skip the browser and paste a token from your dashboard")
  .action(loginCommand);

program
  .command("logout")
  .description("Sign out: revoke this computer's token and remove it")
  .action(logoutCommand);

program
  .command("whoami")
  .description("Show the account you are signed in as")
  .action(whoamiCommand);

program
  .command("create-token [label]")
  .description("Create a named API token for CI (RAMOIRA_TOKEN): it can push and pull, never make a version public")
  .action(createTokenCommand);

program
  .command("book [file]")
  .description("Render a brand book (HTML) from a 3.x schema; --probe to judge sample lines first")
  .option("-o, --out <path>", "Output file path (default: <brandId>-brand-book.html)")
  .option("--probe", "Judge model-drafted sample lines; the ones you mark become examples in your schema")
  .action(bookCommand);

program.parse();
