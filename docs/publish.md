# ramoira publish

Publish your brand schema to ramoira.com. Free.

```
ramoira publish [file]

Arguments:
  file    Path to the schema (default: ramoira/brand.schema.json)
```

## What it does

1. Checks the file locally: a valid 3.0.0 full schema, with `ramoira.brand_id` set to your slug and `ramoira.ratification` null.
2. Sends the full schema to `ramoira.com/api/brands/<slug>/publish`.
3. Ramoira keeps the full schema privately, bound to its `content_hash`, and serves the public summary at a stable URL.

Publishing to a slug no one holds claims it for your account. A slug is never given to anyone else, even after you rename it. Publishing the same version again changes nothing.

Publishing does not ratify the schema. It stays a candidate until the brand ratifies it, and ratification is not available yet.

## Requirements

- A free Ramoira account: `ramoira login` signs you in through the browser (GitHub or an emailed link) and saves a token.
- Or an API token in `RAMOIRA_TOKEN` (create one with `ramoira create-token`, or on your dashboard), for CI.

A 2.0.0 schema is refused, with a pointer to the [migration guide](https://github.com/ramoira/brand-schema-spec/blob/main/migrations/2.0.0-to-3.0.0.md).

## Output

```
✓ Published.
  The slug "your-brand" is now yours. It is never given to anyone else.

  Public summary: https://ramoira.com/brands/your-brand/schema.summary.json
  Version: 1.0.0 · sha256:eaed480d372b…

  Candidate — not ratified. Publishing does not ratify the schema; your full schema stays private.
```

## After publishing

```
https://ramoira.com/brands/<slug>/schema.summary.json    the public summary (free, crawlable)
https://ramoira.com/brands/<slug>/status                 facts: published, ratified, checked
https://ramoira.com/brands/<slug>                        the brand's page
```

The summary holds your public rules and the identity, narrative and voice layers, identically at every tier. Private rules, and the commercial and governance layers, stay out unless you opt them in.
