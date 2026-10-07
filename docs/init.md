# ramoira init

Draft a candidate 3.0.0 brand schema from a short questionnaire.

```
ramoira init [options]

Options:
  -o, --output <path>   Output file path (default: ramoira/brand.schema.json)
  --anchored            Draft from the archetype library (free hosted service; not available yet)
  --no-probes           Skip judging sample lines; judged rules become guidance questions
```

## What it does

1. **Questionnaire.** Who is answering (brand owner, brand team, agency or freelancer), then what the brand makes, what it believes, how it sounds and must never sound, what it must never do, words never to use, claims it can make, competitors never to name, where its content appears, and how it talks about money.
2. **Draft.** Your own model (your `ANTHROPIC_API_KEY`) proposes the rest: who the brand is, its myth and pillars, its voice on each surface, rails, situations, and candidate rules. It writes no sample copy and invents no brand facts.
3. **Judge sample lines.** Some proposed rules need judgment to check ("never present the product as a gadget"). For each, your model drafts two lines; you mark them **That's us**, **Close** or **Not us**, with a reason. A rule you back with a "That's us" and a "Not us" keeps those lines as its examples. Any other becomes a guidance question. The lines are probes: only you see them, and only the ones you judge are kept.
4. **Write.** The CLI assembles a complete 3.0.0 schema, validates it, and writes it with `ramoira/agents.md`.

No Ramoira account. Nothing is sent to Ramoira; the model call goes from your machine to Anthropic with your key.

## What you get

A **candidate**, not your brand's measure. `workflow_state: draft`, `ratification: null`.

All five layers are filled, including pillars, myth evolution, context variants and rails.

| What | Recorded as |
|---|---|
| What you typed: words never to use, competitors, claims, myth, tones | `provenance: authored` |
| Rules the model proposed | `provenance: inherited, affirmed: false`. A schema cannot be ratified until the brand affirms, edits or deletes each one. |
| Lines you judged | examples `judged_by` your role, `source: owner_reaction`; your reactions are kept in `draft_provenance.reactions` |
| Facts the model must not invent: origin story, owned phrases, primary colour, specifications (and claims, if you gave none) | left empty, marked `unfilled` |

Only examples judged by the brand owner or brand team can back a check once the schema is ratified. If an agency or freelancer answers, their judgments are recorded under their role.

## Archetype-anchored drafting

`--anchored` will draft from Ramoira's archetype library: you rate how close your brand is to a few well-known reference brands, and a matching template is adapted to your answers. It runs as a free, no-login hosted service, so the library is never shipped in this CLI. It is not available yet.

## Next steps

```sh
ramoira validate           # check the file is a well-formed schema
ramoira book               # render a brand book
ramoira book --probe       # judge more sample lines
```

Publishing 3.0.0 schemas opens with Ramoira's new service.
