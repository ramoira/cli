import chalk from "chalk";
import { input } from "@inquirer/prompts";
import { readConfig, writeConfig, getToken } from "./config.js";
import { getApiBase } from "./config.js";

export async function loginCommand(): Promise<void> {
  console.log(chalk.gray("Get a token at https://ramoira.com/tokens\n"));

  const token = await input({ message: "Paste your API token:" });
  if (!token.trim()) {
    console.error(chalk.red("Token required."));
    process.exit(1);
  }

  // Verify the token works
  const base = getApiBase();
  let email: string | undefined;
  try {
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    if (res.ok) {
      const body = await res.json() as { email?: string };
      email = body.email;
    }
  } catch {
    // offline — save anyway
  }

  const config = readConfig();
  config.token = token.trim();
  writeConfig(config);

  if (email) {
    console.log(chalk.green(`✓ Logged in as ${email}`));
  } else {
    console.log(chalk.green("✓ Token saved to ~/.ramoira/config.json"));
  }
}

export function logoutCommand(): void {
  const config = readConfig();
  if (!config.token) {
    console.log(chalk.gray("Not logged in."));
    return;
  }
  delete config.token;
  writeConfig(config);
  console.log(chalk.green("✓ Logged out. Token removed from ~/.ramoira/config.json"));
}

export async function whoamiCommand(): Promise<void> {
  const token = getToken();
  if (!token) {
    console.log(chalk.yellow("Not logged in. Run: ramoira login"));
    process.exit(1);
  }

  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      console.log(chalk.red("Token is invalid or expired. Run: ramoira login"));
      process.exit(1);
    }
    if (!res.ok) {
      console.log(chalk.yellow(`Could not verify token (${res.status}). Token is set.`));
      return;
    }
    const body = await res.json() as { email?: string; brandSlug?: string };
    if (body.email) console.log(`  Email: ${chalk.bold(body.email)}`);
    if (body.brandSlug) console.log(`  Brand: ${chalk.bold(body.brandSlug)}`);
  } catch {
    // Network offline — just show token is set
    console.log(chalk.gray("Token is set (offline — cannot verify)."));
  }
}
