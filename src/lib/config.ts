import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// RAMOIRA_CONFIG_DIR moves it (tests, or a CI job that should not read ~).
const configDir = () => process.env.RAMOIRA_CONFIG_DIR ?? join(homedir(), ".ramoira");
const configFile = () => join(configDir(), "config.json");

interface Config {
  token?: string;
  brandSlug?: string;
  apiBase?: string;
  anthropicApiKey?: string;
  /** An unfinished `init --anchored` session, so a later run can continue it. */
  draftToken?: string;
}

export function readConfig(): Config {
  if (!existsSync(configFile())) return {};
  try {
    return JSON.parse(readFileSync(configFile(), "utf8")) as Config;
  } catch {
    return {};
  }
}

export function writeConfig(config: Config): void {
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configFile(), JSON.stringify(config, null, 2) + "\n", "utf8");
}

export function getToken(): string | null {
  return process.env.RAMOIRA_TOKEN ?? readConfig().token ?? null;
}

export function getApiBase(): string {
  return process.env.RAMOIRA_API_URL ?? readConfig().apiBase ?? "https://ramoira.com";
}
