# ramoira book

Generate a brand book HTML from a local brand schema.

```txt
ramoira book [file]

Arguments:
  file    Path to schema file (default: brand.schema.json)

Options:
  -o, --out <path>   Output file path (default: <brandId>-brand-book.html)
```

## What it does

1. Reads your local `brand.schema.json`
2. Uses your Anthropic API key to translate the schema into human-readable copy
3. Writes a self-contained HTML file you can open in any browser and print to PDF

The document is a designed brand book — a deliverable a brand owner or team can read and react to without understanding the schema format. Each brand gets a visual design that matches its character without disclosing how it was selected.

## Requirements

- `ANTHROPIC_API_KEY` in your environment (same key used for `ramoira init`)
- A generated `brand.schema.json` — run `ramoira init` first if you don't have one

## Usage

```sh
# Generate with defaults
ramoira book
# → writes little-rituals-brand-book.html

# Specify schema file and output path
ramoira book my-schema.json --out brand-book.html
```

## Output

```txt
✓ little-rituals-brand-book.html
  Open in any browser. Print to PDF for sharing.
```

## What's in the brand book

| Section | Source |
| --- | --- |
| The story | `narrative.myth` — translated into a human narrative |
| Who it's for | `identity.prism.reflection` + `selfImage` — a character portrait |
| How it sounds | `voice.examples` — approved/rejected copy pairs |
| What it stands for | `narrative.pillars` — named belief statements |
| The hard lines | `governance.severity.absolute` — non-negotiables in plain language |
| In real situations | `voice.contextVariants` — surface-specific copy guidance |

## Sharing with brand managers

The HTML file is self-contained — all fonts load from Google Fonts, no other dependencies. To share as a PDF:

1. Open the file in Chrome or Safari
2. Print → Save as PDF
3. Set margins to None for a clean output
