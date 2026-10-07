# Ramoira CLI

Brand schema generation and publishing for the agent web.

```
npm install -g ramoira
```

## What it does

`ramoira init` asks a short questionnaire, has your own model draft the rest, and lets you judge a few sample lines. It writes a complete 3.0.0 `brand.schema.json` to your project: the rules content must follow, and the facts and voice producers write from. Your own LLM key does the drafting; nothing is sent to Ramoira.

The model writes no sample copy and invents no brand facts. Rules it proposes stay unaffirmed until your brand affirms them, and the only example lines in your schema are the ones you judged.

What `init` produces is a **candidate** schema. It becomes your brand's measure only when you review and ratify it. Publishing the summary does not ratify it.

Once you have a schema, AI tools in your project (Cursor, Claude Code, Windsurf, v0, Lovable) read it automatically. No re-prompting every session. Consistent voice across tools, models, and collaborators.

## Commands

```
ramoira init        Draft a candidate 3.0.0 schema locally (no account required)
ramoira validate    Check a file is a well-formed schema (schema validity, not conformance)
ramoira publish     Publish summary to ramoira.com (2.0.0 today; 3.0.0 opens with the new service)
ramoira book        Render a brand book HTML from your schema (--probe to judge sample lines)
ramoira check       Check content against your schema's rules (no account; judged rules use your key)
ramoira status      Show what is true: published, ratified, checked
ramoira login       Save API token for publish and status commands
```

## Quick start

```sh
# Local only, no account
npx ramoira init
npx ramoira validate

# Check a draft against your rules (no account; judged rules use your own key)
npx ramoira check --surface product_detail_page draft.txt

# Render a brand book HTML (no account, no key)
npx ramoira book
# Judge sample lines first (uses your own ANTHROPIC_API_KEY)
npx ramoira book --probe
# → writes <brandId>-brand-book.html. Open in browser, print to PDF.

# Publish the summary to ramoira.com (free account; get a token at ramoira.com/tokens)
export RAMOIRA_TOKEN=your_token
npx ramoira publish

# Check publication state
npx ramoira status
```

## Guide for Brand Managers

If you are a brand manager running this on your own laptop (Windows or macOS) to generate a brand schema:

1. **Install Node.js (Required):**
   - The CLI requires Node.js 20.10 or later.
   - **Windows:** Download the "LTS" (Long Term Support) installer from [nodejs.org](https://nodejs.org/) and run it. Follow the standard prompts.
   - **macOS:** Download the "LTS" macOS installer from [nodejs.org](https://nodejs.org/) and run it.
   - *Note: After installing, you must restart your terminal or computer.*
2. **Open your terminal:**
   - **macOS:** Press `Cmd + Space`, type `Terminal`, and hit Enter.
   - **Windows:** Press `Win + R`, type `powershell`, and hit Enter.
3. **Get an Anthropic API key:**
   - Go to [console.anthropic.com](https://console.anthropic.com) and create an API key. You will need some credits to run the AI model.
4. **Set the key and run the tool:**
   - **macOS:**
     ```sh
     export ANTHROPIC_API_KEY=sk-ant-your-key-here
     npx ramoira init
     ```
   - **Windows (PowerShell):**
     ```powershell
     $env:ANTHROPIC_API_KEY="sk-ant-your-key-here"
     npx ramoira init
     ```
   - **Windows (Command Prompt):**
     ```cmd
     set ANTHROPIC_API_KEY=sk-ant-your-key-here
     npx ramoira init
     ```
   - **No environment variable?** Just run `npx ramoira init` and paste your key when prompted. It will be saved for future commands.
5. **Answer the questions:** The CLI asks a short questionnaire, your model drafts the rest (a minute or two), and you judge a few sample lines. It then shows a preview and saves `ramoira/brand.schema.json`, a candidate until your brand ratifies it.

## How agents consume your schema

Any agent or tool with access to your project directory reads `brand.schema.json` directly. For remote agents and deployed pipelines, the published summary schema at `ramoira.com/brands/[slug]/schema.summary.json` is publicly accessible and crawlable.

## LLM key

`ramoira init` calls your own LLM to draft the schema, `ramoira book --probe` uses it to draft sample lines for you to judge, and `ramoira check` uses it to decide judged rules. All read `ANTHROPIC_API_KEY` from your environment; `init` prompts for one if it is not set. `ramoira book` without `--probe` needs no key, and `ramoira check` without a key runs every rule except the judged ones.

```sh
export ANTHROPIC_API_KEY=sk-ant-...
ramoira init
```

If you enter the key manually at the prompt, it is saved to `~/.ramoira/config.json` so later commands (`book --probe`, `check`) pick it up automatically — no need to export it again each session.

The CLI calls Anthropic models only.

## Schema format

The schema format is an open standard. Full specification, JSON validators, and worked examples:

**[github.com/ramoira/brand-schema-spec](https://github.com/ramoira/brand-schema-spec)**

## Documentation

Integration guides, field reference, and agent workflow docs:

**[github.com/ramoira/docs](https://github.com/ramoira/docs)**

## Accounts

Everything in this CLI is free. An account is needed only to publish to ramoira.com, so that a brand's slug belongs to whoever owns it.

| | Local | Published |
|---|---|---|
| `ramoira init` | ✓ | ✓ |
| `ramoira validate` | ✓ | ✓ |
| `ramoira book` | ✓ | ✓ |
| `ramoira check` | ✓ | ✓ |
| `ramoira publish` | — | ✓ |
| Account required | No | Yes (free) |
| Schema stored by Ramoira | Nothing | Full schema, privately; only the summary is public |
| Public URL | — | ✓ candidate (unratified) |

Nothing the CLI produces is certified, and no tier makes a schema more trustworthy. What will distinguish one schema from another is whether the brand has *ratified* it and whether content is *checked* against it. `ramoira check` lets you or your producers check content against your schema today, as a self-check (tooling only). Ratification, and checks that others can rely on, are not available yet.

## Testing & local development

**Run the test suite:**

```bash
npm test
```

23 unit tests covering schema validation, JSON extraction, file I/O, and publish logic.

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

**Test the full init flow end-to-end:**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node dist/index.js init
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

**Point publish/status at a local backend:**

```bash
export RAMOIRA_API_URL=http://localhost:3000
node dist/index.js publish
node dist/index.js status my-brand
```

## License

MIT — the CLI and schema format are open source. Brand schemas you generate are yours entirely.
