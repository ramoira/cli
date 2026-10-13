import chalk from "chalk";

// `ramoira publish` gave way to `push` (roadmap D20): an upload is a private,
// proposed version, and only the owner, signed in on ramoira.com, makes a
// version public. A coding agent holds every credential this CLI does, so
// publishing cannot be a CLI command.

export async function publishCommand(): Promise<void> {
  console.error(chalk.yellow("ramoira publish is now ramoira push."));
  console.error(chalk.gray("  push uploads a private version for review. The owner makes it public on ramoira.com, signed in."));
  process.exit(1);
}
