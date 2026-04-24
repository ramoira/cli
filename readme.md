# Ramoira CLI

Brand schema generation and publishing for the agent web.

```
npm install -g ramoira
```

## What it does

`ramoira init` asks you ten questions and generates a `brand.schema.json` in your project — a structured, machine-readable definition of your brand identity. Your own LLM key does the generation. Nothing leaves your machine.

Once you have a schema, AI tools in your project (Cursor, Claude Code, Windsurf, v0, Lovable) read it automatically. No re-prompting every session. Consistent voice across tools, models, and collaborators.

## Commands

```
ramoira init        Generate brand.schema.json locally (no account required)
ramoira validate    Validate schema against the Ramoira spec
ramoira publish     Publish summary to ramoira.com (free account required)
ramoira status      Show current publication state
ramoira login       Save API token for publish and status commands
```

## Quick start

```sh
# Tier 1 — local only, no account
npx ramoira init
npx ramoira validate

# Tier 2 — publish to ramoira.com (get a token at ramoira.com/tokens)
export RAMOIRA_TOKEN=your_token
npx ramoira publish

# Check publication state
npx ramoira status
```

## How agents consume your schema

Any agent or tool with access to your project directory reads `brand.schema.json` directly. For remote agents and deployed pipelines, the published summary schema at `ramoira.com/brands/[slug]/schema.summary.json` is publicly accessible and crawlable.

## LLM key

`ramoira init` calls your own LLM to generate the schema. It reads `ANTHROPIC_API_KEY` from your environment, or prompts you for one if not set. The key is used once for generation and never stored.

```sh
export ANTHROPIC_API_KEY=sk-ant-...
ramoira init
```

OpenAI-compatible providers: set `OPENAI_API_KEY` and `OPENAI_BASE_URL`.

## Schema format

The schema format is an open standard. Full specification, JSON validators, and worked examples:

**[github.com/ramoira/brand-schema-spec](https://github.com/ramoira/brand-schema-spec)**

## Documentation

Integration guides, field reference, and agent workflow docs:

**[github.com/ramoira/docs](https://github.com/ramoira/docs)**

## Tiers

| | Tier 1 — Local | Tier 2 — Published | Tier 3 — Studio |
|---|---|---|---|
| `ramoira init` | ✓ | ✓ | ✓ |
| `ramoira validate` | ✓ | ✓ | ✓ |
| `ramoira publish` | — | ✓ | ✓ |
| `ramoira studio` | — | — | ✓ |
| Account required | No | Yes (free) | Yes (paid) |
| Schema stored by Ramoira | Nothing | Summary only | Full (private) |
| Public URL | — | ✓ draft | ✓ certified |
| LLM flywheel | — | Slow | Fast |

## License

MIT — the CLI and schema format are open source. Brand schemas you generate are yours entirely.
