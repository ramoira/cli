# ramoira init

Generate a `brand.schema.json` in the current directory.

```
ramoira init [options]

Options:
  -o, --output <path>   Output file path (default: brand.schema.json)
```

## What it does

Runs a short intake (10 questions), calls your LLM with the answers, and writes a fully populated brand schema to disk. Nothing is sent to Ramoira.

## LLM key

Reads `ANTHROPIC_API_KEY` from your environment. If not set, prompts you for one. The key is used once and never stored by the CLI.

```sh
export ANTHROPIC_API_KEY=sk-ant-...
ramoira init
```

## Questions asked

| Question | Schema field |
|---|---|
| Brand name | `meta.brandName` |
| Brand ID (slug) | `meta.brandId` |
| What the brand makes or does | `narrative.semiotic.denotative.categoryDescriptor` |
| What the brand stands for | `narrative.myth.mythStatement` |
| Three words it should always feel like | `identity.summary.threeAdjectives` |
| How the brand relates to customers (8 options) | `identity.prism.relationship.mode` |
| Always on-brand tones | `voice.approvedTones` |
| Always off-brand tones | `voice.forbiddenTones` |
| Five things the brand must never do | `identity.summary.neverDo` |
| Pricing approach (5 options) | `commercial.pricing.style` |

All remaining schema fields (voice examples, content tests, governance preflight, etc.) are synthesised by the LLM from your answers.

## Output

A `brand.schema.json` conforming to the Ramoira v2.0.0 spec. The file is validated before being written. If validation issues are found, you are shown the errors and asked whether to save anyway.

## Schema format

The full schema specification, field reference, and worked examples are at:
[github.com/ramoira/brand-schema-spec](https://github.com/ramoira/brand-schema-spec)

## Next steps

```sh
ramoira validate           # re-validate at any time
ramoira publish            # publish to ramoira.com (account required)
```
