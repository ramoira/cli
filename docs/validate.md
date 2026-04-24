# ramoira validate

Validate a brand schema against the Ramoira spec.

```
ramoira validate [file] [options]

Arguments:
  file              Path to schema file (default: brand.schema.json)

Options:
  --summary         Validate against the summary schema instead
```

## What it does

Validates a local `brand.schema.json` against the Ramoira v2.0.0 JSON Schema spec. No network call. No account required. Exits with code 1 on failure — CI-friendly.

## Examples

```sh
ramoira validate                          # validate brand.schema.json in cwd
ramoira validate path/to/brand.schema.json
ramoira validate --summary                # validate a summary schema
```

## Error output

Each validation error is printed with its field path and the constraint that failed:

```
✗ brand.schema.json failed validation:

  · /identity/summary/threeAdjectives must NOT have fewer than 3 items
  · /voice/examples must NOT have fewer than 2 items
  · /governance/preflight/question1 must NOT have fewer than 1 characters
```

## Schema format

The spec the CLI validates against is the same as the open standard at:
[github.com/ramoira/brand-schema-spec](https://github.com/ramoira/brand-schema-spec)

The bundled spec version is pinned to the CLI release. When the spec updates, a new CLI version ships the updated validator.
