import { readFileSync } from "fs";
import { defineConfig } from "vitest/config";

// Markdown imports are text, as tsup's text loader makes them in the build.
export default defineConfig({
  plugins: [
    {
      name: "markdown-as-text",
      enforce: "pre",
      load(id) {
        if (id.endsWith(".md")) return `export default ${JSON.stringify(readFileSync(id, "utf8"))};`;
      },
    },
  ],
});
