# Ramoira CLI

Draft, validate and share an open brand schema: one file that tells every AI tool in your project what your brand means.

```
npm install -g ramoira
```

## What it does

`ramoira init` sets your project up for **your own coding agent** (Claude Code, Codex, GitHub Copilot in VS Code, Cursor, Windsurf, JetBrains agents) to draft your brand schema. It installs the drafting protocol, `ramoira/DRAFTING.md`, and points your project's agent instructions (`AGENTS.md`, plus `CLAUDE.md` and `.github/copilot-instructions.md` where you have them) at it. Then ask your agent:

> Read ramoira/DRAFTING.md and draft our brand schema.

It reads your project and anything you give it, asks what it can't find, and writes `ramoira/brand.schema.json`: the rules your content must follow, and the facts and voice it writes from. No account, no Ramoira model; your agent does the work.

The agent writes no marketing copy, no example lines and no invented facts. Every rule it proposes stays unaffirmed until you affirm it.

`ramoira init --anchored` drafts from reference brands instead, in your browser: you rate eight reference archetypes, pick the lines that sound most and least like you, write the facts only you know, and decide on each rule you start from. It is a free service hosted by Ramoira, with no account and no model key; no model writes anything. Your answers are kept for 30 days after your last one, and you can discard them at any time.

## Review on ramoira.com, then make it public

Like a git branch: `ramoira push` uploads the schema as a **private** version. Anyone holding the credential can push: you, your agent, or CI with `RAMOIRA_TOKEN`. Nothing is public. You then review it on ramoira.com, signed in: affirm, edit or delete each rule, keep or rewrite each field, and either **make it public** or **send it back**. If you send it back, `ramoira pull` brings down the reviewed version and your brief (`ramoira/REVIEW.md`), and your agent makes the changes.

Making a version public is never a CLI command: your agent can run anything this CLI can, so only you, in the browser, publish.

What you publish is still a **candidate**. It becomes your brand's measure only when the brand ratifies it, which is not available yet.

## Commands

```
ramoira init        Set the project up for your coding agent (installs ramoira/DRAFTING.md); --anchored drafts in your browser
ramoira hash        Print the schema's content_hash; --write puts it into the file (run after every edit)
ramoira validate    Check a file is a well-formed schema (schema validity, not conformance)
ramoira check       Check content against your schema's rules (no account; judged rules use your own key)
ramoira push        Upload a private version for review on ramoira.com (free account); nothing becomes public
ramoira pull        Bring down the version you reviewed, and your brief if you sent it back
ramoira book        Render a brand book HTML from your schema (--probe to judge sample lines)
ramoira status      Show what is true: published, ratified, checked
ramoira login       Sign in for push and pull (or set RAMOIRA_TOKEN)
```

## Quick start

```sh
# Set up, no account
npx ramoira init
# … then ask your agent: "Read ramoira/DRAFTING.md and draft our brand schema."

# The agent finishes with
npx ramoira hash --write
npx ramoira validate

# Check a draft against your rules (no account; judged rules use your own key)
npx ramoira check --surface product_detail_page draft.txt

# Upload for review (free account: sign in through the browser)
npx ramoira login
npx ramoira push
# … review on ramoira.com; if you send it back:
npx ramoira pull
```

`ramoira/sync.json` records which brand the project pushes to and which reviewed version the file is based on, like a branch's upstream. Commit it with the schema. `push` refuses a file based on an older reviewed version (run `pull` first), and `pull` refuses to overwrite changes that were never pushed (unless `--force`).

## How agents consume your schema

Any agent or tool with access to your project directory reads `brand.schema.json` directly; `init` points your agent instructions at it. For remote agents and deployed pipelines, a public summary is served at `ramoira.com/brands/[slug]/schema.summary.json` once you make a version public.

## LLM key

Drafting needs no key from you beyond your coding agent's own. `ramoira book --probe` uses your `ANTHROPIC_API_KEY` to draft sample lines for you to judge, and `ramoira check` uses it to decide judged rules; without a key, `check` runs every rule except the judged ones. A key entered at a prompt is saved to `~/.ramoira/config.json`. The CLI calls Anthropic models only.

## Schema format

The schema format is an open standard. Full specification, JSON validators, and worked examples:

**[github.com/ramoira/brand-schema-spec](https://github.com/ramoira/brand-schema-spec)**

## Documentation

Integration guides, field reference, and agent workflow docs:

**[github.com/ramoira/docs](https://github.com/ramoira/docs)**

## Accounts

Everything in this CLI is free. An account is needed only to push to ramoira.com, so that a brand's slug belongs to whoever owns it.

| | Local | On ramoira.com |
|---|---|---|
| `ramoira init`, `hash`, `validate`, `check`, `book` | ✓ | ✓ |
| `ramoira push`, `pull` | — | ✓ |
| Account required | No | Yes (free) |
| Schema stored by Ramoira | Nothing | Full schema, privately; a summary is public only once you make a version public |
| Public URL | — | ✓ candidate (unratified) |

Nothing the CLI produces is certified, and no tier makes a schema more trustworthy. What will distinguish one schema from another is whether the brand has *ratified* it and whether content is *checked* against it. `ramoira check` lets you or your producers check content against your schema today, as a self-check (tooling only). Ratification, and checks that others can rely on, are not available yet.

## Testing & local development

**Run the test suite:**

```bash
npm test
```

Unit tests covering schema validation, the drafting protocol install, push and pull (against a mocked server), checking and the brand book.

**Build the CLI:**

```bash
npm run build        # compiles to dist/index.js
```

**Run commands without a global install:**

```bash
# tsx — no build needed, fastest for dev iteration
node --import tsx/esm src/index.ts init

# built dist
node dist/index.js init
node dist/index.js --help
```

**Test the init flow end-to-end** (in a scratch project):

```bash
node dist/index.js init        # installs ramoira/DRAFTING.md, updates AGENTS.md
# have your agent draft ramoira/brand.schema.json, then
node dist/index.js hash --write
node dist/index.js validate
```

**Test validate against a bad file:**

```bash
echo '{"meta":{}}' > bad.json
node dist/index.js validate bad.json
# exits 1 with a list of errors
```

**Test auth commands (no API required):**

```bash
node dist/index.js whoami    # not logged in
node dist/index.js login     # paste any token to test storage
node dist/index.js whoami    # shows token is set
node dist/index.js logout
```

**Point push/pull/status at a local backend:**

```bash
export RAMOIRA_API_URL=http://localhost:3000
node dist/index.js push
node dist/index.js status my-brand
```

`RAMOIRA_CONFIG_DIR` moves `~/.ramoira` (where `login` keeps its token).

## License

MIT — the CLI and schema format are open source. Brand schemas you draft are yours entirely.
