# Configuration

The CLI reads configuration from environment variables and `~/.ramoira/config.json`.

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for `ramoira init` schema generation |
| `OPENAI_API_KEY` | OpenAI-compatible API key (alternative to Anthropic) |
| `OPENAI_BASE_URL` | Base URL for OpenAI-compatible provider |
| `RAMOIRA_TOKEN` | API token for `ramoira publish` and `ramoira status` |
| `RAMOIRA_API_URL` | Override platform URL (default: `https://ramoira.com`) |

## Config file

`ramoira login` saves your token to `~/.ramoira/config.json`. You can also edit it directly:

```json
{
  "token": "your_api_token",
  "brandSlug": "your-brand"
}
```

Environment variables take precedence over the config file.

## Schema spec

The validator bundled in this CLI corresponds to the open schema standard at:
[github.com/ramoira/brand-schema-spec](https://github.com/ramoira/brand-schema-spec)

## Documentation

[github.com/ramoira/docs](https://github.com/ramoira/docs)
