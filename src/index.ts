import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";

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

program.parse();
