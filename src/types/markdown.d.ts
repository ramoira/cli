// Markdown files are imported as text: tsup's text loader in the build,
// the plugin in vitest.config.ts in tests.
declare module "*.md" {
  const text: string;
  export default text;
}
