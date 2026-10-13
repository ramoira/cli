# ramoira init

Set your project up for your own coding agent to draft the brand schema. Free; no account, no model key.

```
ramoira init [options]

Options:
  --anchored            Draft from reference brands in your browser instead (free hosted service, no account)
  -o, --output <path>   With --anchored: where to save the schema (default: ramoira/brand.schema.json)
```

## What it does

It installs, in the current project:

| Path | What |
|---|---|
| `ramoira/DRAFTING.md` | The drafting protocol your agent follows: what to gather, what to ask, how to write and validate the file, and what it must never do |
| `ramoira/spec/` | A local copy of the spec (`SPEC.md`, `SPEC.schema.json`, a minimal example, and a README naming the versions), so an agent without web access has the format |
| `ramoira/README.md` | A page for you: what the folder holds, draft → push → review → make public or send back → pull, and the next version |
| `AGENTS.md` | A brand schema section between `<!-- ramoira:start -->` and `<!-- ramoira:end -->`, also added to `CLAUDE.md` and `.github/copilot-instructions.md` where they exist |

Then ask your agent (Claude Code, Codex, GitHub Copilot in VS Code, Cursor, Windsurf, JetBrains agents):

> Read ramoira/DRAFTING.md and draft our brand schema.

It reads your project and anything you give it, asks only what it can't find, and writes `ramoira/brand.schema.json` with all five layers, then runs `ramoira hash --write` and `ramoira validate`.

## What you get

A **candidate**: your draft of what the brand means, until the brand ratifies it. `workflow_state: draft`, `ratification: null`.

| What | Recorded as |
|---|---|
| What you told the agent in your own words | `authored` |
| What the agent proposed or took from your material | fields `inherited`; rules `provenance: inherited, affirmed: false` |
| Facts nobody knew | left out, marked `unfilled`; never invented |

Only you can affirm a rule, keep a field or judge an example, signed in on ramoira.com. A push that claims one you never made is refused.

## Running it again

Run `init` again after updating the CLI: it refreshes `DRAFTING.md`, `ramoira/spec/`, `ramoira/README.md` and the section in your instruction files, and never touches your schema. A `ramoira/README.md` you wrote yourself (without Ramoira's marker line) is left alone. `validate`, `hash` and `push` say when the project's `DRAFTING.md` is not the one this CLI ships.

## Drafting in the browser (`--anchored`)

`--anchored` drafts from Ramoira's reference brands instead: you rate how close your brand is to a few well-known brands, pick the lines that sound most and least like you, write the facts only you know, and decide on each rule you start from. It runs as a free, no-login service on ramoira.com; no model writes anything. The CLI opens it in your browser and saves the candidate (with `ramoira/agents.md`, a plain-language brief) when you finish.

## Next steps

```sh
ramoira validate                 # the file is a well-formed schema
ramoira login                    # free
ramoira push --slug your-brand   # a private version for your review on ramoira.com
```

See [push and pull](push.md).
