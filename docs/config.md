# Configuration

The CLI reads configuration from environment variables and `~/.ramoira/config.json`. Nothing about your account is kept in the project.

## Environment variables

| Variable | Description |
|---|---|
| `RAMOIRA_TOKEN` | An API token (for CI). Takes precedence over the token `ramoira login` saved |
| `RAMOIRA_API_URL` | The server to talk to (default: `https://ramoira.com`) |
| `RAMOIRA_CONFIG_DIR` | Where the CLI keeps its settings (default: `~/.ramoira`) |
| `ANTHROPIC_API_KEY` | Your own Anthropic key, for judged rules in `ramoira check` and for `ramoira book --probe`. Drafting needs none |

## Config file

`ramoira login` saves your token to `~/.ramoira/config.json` (and retires the one it saved before on this computer); `ramoira logout` revokes it and removes it.

## In the project

| Path | Written by |
|---|---|
| `ramoira/brand.schema.json` | your agent (or `init --anchored`), and `pull` |
| `ramoira/DRAFTING.md`, `ramoira/spec/`, `ramoira/README.md` | `init` |
| `ramoira/sync.json` | `push` and `pull`: the brand, the reviewed base, the last push |
| `ramoira/REVIEW.md` | `pull`, when the owner sent a version back |

Commit them all.

## Schema spec

The validator and checker bundled in this CLI are the spec's own, at the commit this CLI pins:
[github.com/ramoira/brand-schema-spec](https://github.com/ramoira/brand-schema-spec)

## Documentation

[github.com/ramoira/docs](https://github.com/ramoira/docs)
