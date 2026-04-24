# Changelog

## 0.1.0 — 2026-04-24

Initial release.

### Commands

- `ramoira init` — interactive brand schema generation via your own LLM key
- `ramoira validate` — local schema validation against Ramoira spec v2.0.0, CI-friendly
- `ramoira publish` — publish summary schema to ramoira.com (requires account)
- `ramoira status` — check publication state for a brand slug
- `ramoira login` / `logout` / `whoami` — token management

### Notes

- Schemas are validated against the bundled Ramoira spec v2.0.0
- Full schema never leaves your machine; only the summary is published
- `validate` has no network requirement — safe for offline/air-gapped CI
