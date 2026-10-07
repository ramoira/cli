# ramoira validate

Check that a file is a well-formed schema.

```
ramoira validate [file]

Arguments:
  file    Path to the file (default: ramoira/brand.schema.json)
```

## What it does

`validate` checks **schema validity**: is this file a well-formed schema under the spec? It does not check any content against the schema. That is conformance, a different operation.

It reads the file, works out what it is, and checks it against the [Ramoira spec 3.0.0](https://github.com/ramoira/brand-schema-spec):

- full schemas, public summaries and archetype templates;
- verdict records and adoption records.

Beyond the JSON Schema, it enforces the spec's validation invariants (SPEC.md §12): unique ids and resolving references, judged rules backed by brand-judged examples, the conditions for a ratification pointer, what a summary may contain, and that `content_hash` recomputes. Each error names the invariant behind it.

No network call. No account. Exits 1 on failure, so it works in CI.

A **2.0.0** schema is still checked against the old spec, with a pointer to the [migration guide](https://github.com/ramoira/brand-schema-spec/blob/main/migrations/2.0.0-to-3.0.0.md).

## Output

```
✓ ramoira/brand.schema.json is a valid 3.0.0 full schema.
  · /draft_provenance/fields 1 field(s) unfilled: /identity/distinctiveAssets/sonic/sonicLogoURL

  This checks that the file is a well-formed schema. It does not check any content against it.
  Candidate — not ratified.
```

Errors are red, warnings yellow. A warning (for example, a field left unfilled) never fails validation.

## The validator

The CLI bundles the spec's reference validator (`@ramoira/schema`), pinned to a spec commit. The same validator is used by Ramoira's own services, so a file that passes here passes there.
