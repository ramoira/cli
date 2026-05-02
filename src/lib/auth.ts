import chalk from "chalk";
import { input } from "@inquirer/prompts";
import ora from "ora";
import { readConfig, writeConfig, getToken, getApiBase } from "./config.js";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function loginCommand(options: { manual?: boolean } = {}): Promise<void> {
  if (options.manual) {
    await manualLogin();
    return;
  }

  const base = getApiBase();

  // Request device code
  let deviceCode: string, userCode: string, verificationUriComplete: string, expiresIn: number, interval: number;
  try {
    const res = await fetch(`${base}/api/auth/device/code`, { method: "POST" });
    if (!res.ok) throw new Error(`${res.status}`);
    const body = await res.json() as {
      device_code: string;
      user_code: string;
      verification_uri_complete: string;
      expires_in: number;
      interval: number;
    };
    deviceCode = body.device_code;
    userCode = body.user_code;
    verificationUriComplete = body.verification_uri_complete;
    expiresIn = body.expires_in;
    interval = body.interval;
  } catch {
    console.log(chalk.yellow("Could not reach ramoira.com. Falling back to manual token entry."));
    await manualLogin();
    return;
  }

  console.log("");
  console.log(chalk.bold("  Open this URL in your browser:"));
  console.log("  " + chalk.cyan(verificationUriComplete));
  console.log("");
  console.log(chalk.bold("  Confirm your code:") + "  " + chalk.white.bold(userCode));
  console.log("");

  // Best-effort browser open
  try {
    const { default: open } = await import("open");
    await open(verificationUriComplete);
  } catch {
    // ignore — URL is already printed
  }

  const spinner = ora("Waiting for GitHub authorization…").start();
  const deadline = Date.now() + expiresIn * 1000;
  let pollInterval = interval * 1000;

  const onSigint = () => { spinner.stop(); process.exit(0); };
  process.on("SIGINT", onSigint);

  try {
    while (Date.now() < deadline) {
      await sleep(pollInterval);

      let res: Response;
      try {
        res = await fetch(`${base}/api/auth/device/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_code: deviceCode }),
        });
      } catch {
        continue; // transient network error
      }

      if (res.status === 200) {
        const body = await res.json() as { token: string; brand_slug?: string };
        const config = readConfig();
        config.token = body.token;
        if (body.brand_slug) config.brandSlug = body.brand_slug;
        writeConfig(config);

        // Fetch email for display
        let email: string | undefined;
        try {
          const me = await fetch(`${base}/api/auth/me`, {
            headers: { Authorization: `Bearer ${body.token}` },
          });
          if (me.ok) email = ((await me.json()) as { email?: string }).email ?? undefined;
        } catch { /* ignore */ }

        spinner.succeed(chalk.green(`Logged in${email ? ` as ${email}` : ""}`));
        return;
      }

      if (res.status === 400) {
        spinner.fail(chalk.red("Authorization request expired. Re-run: ramoira login"));
        process.exit(1);
      }

      if (res.status === 429) {
        pollInterval += 5000;
        continue;
      }

      // 202 authorization_pending or other: continue polling
    }

    spinner.fail(chalk.red("Timed out waiting for authorization. Re-run: ramoira login"));
    process.exit(1);
  } finally {
    process.off("SIGINT", onSigint);
  }
}

async function manualLogin(): Promise<void> {
  console.log(chalk.gray("Get a token at https://ramoira.com/tokens\n"));

  const token = await input({ message: "Paste your API token:" });
  if (!token.trim()) {
    console.error(chalk.red("Token required."));
    process.exit(1);
  }

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
    console.log(chalk.gray("Token is set (offline — cannot verify)."));
  }
}
