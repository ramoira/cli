import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".ramoira");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  token?: string;
  brandSlug?: string;
  apiBase?: string;
  anthropicApiKey?: string;
}

export function readConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as Config;
  } catch {
    return {};
  }
}

export function writeConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export function getToken(): string | null {
  return process.env.RAMOIRA_TOKEN ?? readConfig().token ?? null;
}

export function getApiBase(): string {
  return process.env.RAMOIRA_API_URL ?? readConfig().apiBase ?? "https://ramoira.com";
}
