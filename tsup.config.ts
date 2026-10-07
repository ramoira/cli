import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  dts: false,
  loader: { ".json": "json" },
  // The spec's validator is installed from GitHub; bundle it so npm users of
  // the CLI never fetch or build a git dependency.
  noExternal: ["@ramoira/schema"],
});
