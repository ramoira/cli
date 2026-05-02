import chalk from "chalk";
import { input } from "@inquirer/prompts";
import { getToken, getApiBase } from "../lib/config.js";

export async function createTokenCommand(labelArg?: string): Promise<void> {
  const token = getToken();
  if (!token) {
    console.log(chalk.yellow("Not logged in. Run: ramoira login"));
    process.exit(1);
  }

  const label = labelArg?.trim() ||
    await input({ message: "Token label (e.g. ci-deploy):" });

  if (!label) {
    console.error(chalk.red("Label required."));
    process.exit(1);
  }

  const base = getApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}/api/tokens`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label }),
    });
  } catch {
    console.error(chalk.red("Network error. Check your connection and try again."));
    process.exit(1);
  }

  if (res.status === 401) {
    console.error(chalk.red("Token invalid or expired. Run: ramoira login"));
    process.exit(1);
  }

  if (res.status === 404) {
    console.error(chalk.red("No brand found for this account. Create one at https://ramoira.com/create-brand"));
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    console.error(chalk.red(`Failed to create token: ${body.error ?? res.status}`));
    process.exit(1);
  }

  const body = await res.json() as { token: string; label: string };

  console.log("");
  console.log(chalk.green(`✓ Token created: ${body.label}`));
  console.log("");
  console.log("  " + chalk.bold(body.token));
  console.log("");
  console.log(chalk.yellow("  Copy this token now — it will not be shown again."));
  console.log("");
}
