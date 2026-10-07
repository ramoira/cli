# ramoira book

Render a brand book (one HTML file) from a 3.0.0 brand schema.

```txt
ramoira book [file] [options]

Arguments:
  file    Path to schema file (default: ramoira/brand.schema.json)

Options:
  -o, --out <path>   Output file path (default: ramoira/<brand_id>-brand-book.html)
  --probe            Judge model-drafted sample lines first; the ones you mark become examples in your schema
```

## What it does

`ramoira book` lays out what your schema already says: your story, who you talk to, how you sound, your pillars and your rules. It calls no model and needs no account or API key. Every line in the book comes from your schema.

The example copy in the book (approved and rejected lines, and the "real world" chapter) comes **only from examples your brand judged**: `voice.examples` with `judged_by: brand_owner` or `brand_team`. Ramoira does not write content for you, so nothing a model drafted appears in the book unless your brand judged it.

The cover says **Candidate — not ratified** until your brand ratifies the schema.

## Judging sample lines: `--probe`

If your schema has few brand-judged examples, run a probe session:

```sh
ramoira book --probe
```

1. You say who is judging: brand owner, brand team, agency or freelancer.
2. A model, using your own `ANTHROPIC_API_KEY`, drafts a few short lines for your surfaces. These are **probes**, not content: only you see them.
3. You mark each one **That's us**, **Close** or **Not us**, and say why.
4. "That's us" becomes an approved example and "Not us" a rejected example, both judged by the role you chose. "Close" is recorded but adds no example. Every reaction is kept in `draft_provenance.reactions` as the evidence behind the judgment.
5. You confirm, the schema is updated (its `content_hash` changes), and the book is rendered.

Only brand owner and brand team judgments appear in the book and can ground a judged rule. An agency's or freelancer's judgments are recorded under their role, but are kept out of the book.

A ratified schema is never edited: adding examples would change the version the brand ratified.

## Requirements

- A 3.0.0 schema. A 2.0.0 schema is refused, with a link to the [migration guide](https://github.com/ramoira/brand-schema-spec/blob/main/migrations/2.0.0-to-3.0.0.md).
- For `--probe` only: `ANTHROPIC_API_KEY`, and an interactive terminal.

## What's in the brand book

| Section | Source |
| --- | --- |
| The story | `narrative.myth.culturalTension` and `mythStatement` |
| Who it's for | `identity.prism.reflection.depictedCustomer` and `ageSignal` |
| What it will never be | rule statements with an `identity.*` topic |
| How it sounds | `identity.prism.personality.characterBrief`, `voice.approvedTones`, `voice.*` rules, and brand-judged examples |
| What it stands for | `narrative.pillars` |
| The rules | rule statements by severity (absolute, then strong); `narrative.guidance` questions |
| In the real world | brand-judged approved examples, with each surface's opening instruction |

## Sharing

The HTML file is self-contained apart from Google Fonts. To share it as a PDF: open it in Chrome or Safari, Print → Save as PDF, margins None.
