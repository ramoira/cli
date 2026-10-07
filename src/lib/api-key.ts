import { readConfig, writeConfig } from "./config.js";

/** The user's own Anthropic key: ANTHROPIC_API_KEY, else the one saved in ~/.ramoira/config.json. */
export function resolveApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? readConfig().anthropicApiKey ?? null;
}

export function saveApiKey(key: string): void {
  const config = readConfig();
  config.anthropicApiKey = key;
  writeConfig(config);
}
