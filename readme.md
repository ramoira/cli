# Ramoira CLI

Brand schema infrastructure for the agent web.

## Install

npm install -g ramoira

## Commands

ramoira init      Generate a brand schema locally
ramoira validate  Validate schema against the Ramoira spec
ramoira publish   Publish schema to ramoira.com (free account required)
ramoira status    Show current schema state

## What is a brand schema?

A structured, versioned, agent-readable definition of
your brand identity. Lives in your project. Consumed by
AI tools automatically. No re-prompting every session.

## How agents consume it

Any MCP client reads ramoira.config.json in your project root
and fetches the schema automatically. Cursor, Claude Code,
Windsurf, and others support this natively.

## Spec

The schema format is defined in:
github.com/ramoira/schema-spec

## License

MIT — the CLI and schema format are open source.
Brand schemas you generate are yours entirely.
