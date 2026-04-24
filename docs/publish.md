# ramoira publish

Publish a local brand schema to ramoira.com.

```
ramoira publish [file]

Arguments:
  file    Path to schema file (default: brand.schema.json)
```

## What it does

1. Validates the schema locally (same as `ramoira validate`)
2. POSTs the full schema to `ramoira.com/api/brands/[slug]/publish`
3. The platform extracts the summary schema and publishes it at a stable public URL
4. Returns the canonical URL

The full schema is never stored publicly. Only the summary (identity, narrative, voice layers) is published.

## Requirements

- A Ramoira account and API token (get one at [ramoira.com/tokens](https://ramoira.com/tokens))
- `RAMOIRA_TOKEN` in your environment, or run `ramoira login` first

## Authentication

```sh
# Option 1 — environment variable
export RAMOIRA_TOKEN=your_token
ramoira publish

# Option 2 — saved token
ramoira login
ramoira publish
```

## Output

```
✓ Published to https://ramoira.com/brands/your-brand/schema.summary.json
```

## After publishing

Your summary schema is publicly accessible at:
```
https://ramoira.com/brands/[slug]/schema.summary.json
https://ramoira.com/brands/[slug]/status
```

Remote agents, LLM crawlers, and collaborators can fetch it from anywhere.

## Documentation

Integration guides and agent workflow docs:
[github.com/ramoira/docs](https://github.com/ramoira/docs)
