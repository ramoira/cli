import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  dts: false,
  loader: { ".json": "json", ".md": "text" },
  // The spec's validator is installed from GitHub; bundle it so npm users of
  // the CLI never fetch or build a git dependency.
  // The drafting protocol (DRAFTING.md) comes from the same pinned commit.
  noExternal: ["@ramoira/schema"],
});
