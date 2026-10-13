import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { RAMOIRA_DIR } from "./files.js";

// The page `init` writes for the person (roadmap D20): what the ramoira/
// folder holds and how a schema moves from draft to public and on to the
// next version. DRAFTING.md is for their agent; this is for them. It is
// Ramoira's own page, replaced on every init; a README.md the person wrote
// themselves (no marker) is left alone.

export const README_PATH = `${RAMOIRA_DIR}/README.md`;
export const README_MARKER = "<!-- Written by ramoira init. Run it again to refresh this page; edits here are replaced. -->";

/** Whether the README.md here is Ramoira's (or absent), so init may write it. */
export function readmeIsOurs(): boolean {
  const abs = resolve(README_PATH);
  return !existsSync(abs) || readFileSync(abs, "utf8").includes(README_MARKER);
}

export function projectReadme(versions: { cli: string; spec: string; drafting: string }): string {
  return `# Your brand schema

${README_MARKER}

This folder holds your brand schema: one file that says what your brand means (what it makes and believes, how it sounds, which claims it may make, and the rules its content must keep), so every AI tool and writer in this project works from the same source, and its rules can be checked. The format is Ramoira's open brand schema.

\`DRAFTING.md\` is for your coding agent. This page is for you.

## What's here

| File | What it is | Commit it |
|---|---|---|
| \`brand.schema.json\` | The schema. A candidate until your brand ratifies it. | Yes |
| \`sync.json\` | Where this file stands on ramoira.com: your brand's slug, the version you last reviewed, the last one pushed. Written by \`push\` and \`pull\`. | Yes |
| \`REVIEW.md\` | Your requests, when you send a version back. Written by \`pull\`, removed when nothing is waiting. | Yes |
| \`DRAFTING.md\` | The drafting protocol your agent follows. | Yes |
| \`spec/\` | A local copy of the spec, so your agent needs no web access. | Yes |
| \`agents.md\` | A plain-language brief of the schema, written when you draft in the browser (\`init --anchored\`). | Yes |
| \`README.md\` | This page. | Yes |

## Draft, review, make public

1. **Draft.** Ask your coding agent: *"Read ramoira/DRAFTING.md and draft our brand schema."* It reads your project and anything you give it, asks what it can't find, writes \`brand.schema.json\` and validates it. It proposes; it never pushes on its own, and it never affirms anything for you.
2. **Push.** Sign in once with \`npx ramoira login\` (free), then \`npx ramoira push --slug your-brand\` (the slug only the first time). The version is private: nothing is public yet.
3. **Review**, signed in at ramoira.com/dashboard. Only you can do this; no agent or token can.
   - Each rule: **Affirm**, **Edit** or **Delete**. A rule counts once you affirm it.
   - Each proposed field: **Keep** what is right, **Rewrite** what is not, in your words.
   - Then **Make public**, or **Send back to your agent** with what to change.
4. **Pull.** \`npx ramoira pull\` brings the reviewed version down, with your decisions. If you sent it back, your requests are in \`REVIEW.md\`: ask your agent *"Make the changes in ramoira/REVIEW.md."* It validates and pushes again, and you review only what changed.

**Always pull after a review.** A push built on an older version is refused as out of date: run \`npx ramoira pull\` and make the change again on top of it.

## Changing it later

A version you made public never changes, like a commit. You make a new version; the public one stays as it is until you make the new one public.

- **With your agent:** pull, ask for the change, push, review.
- **Yourself, in the browser:** **Revise** on the dashboard opens your last reviewed version. Edit or delete rules, rewrite fields, then make it public, or write requests and send it back to your agent. Afterwards, run \`npx ramoira pull\` here.
- **Without the CLI:** upload \`brand.schema.json\` on the dashboard. It goes through the same review.

A public version can't be taken down yet, only replaced by a newer one.

## What's public and what's private

- **Public**, once you make a version public: its summary (\`ramoira.com/brands/<slug>/schema.summary.json\`: the rules, identity, narrative and voice), the brand page, and its status (facts only, never a score).
- **Private**: the full schema, and every version you have not made public.
- **Public is not ratified.** It stays a candidate; Ramoira certifies nothing.
- **Your slug is yours.** Rename it on the dashboard: the old address redirects and is never given to anyone else. Each version's fingerprint (\`content_hash\`) stays the same.

## Using it

- **Your coding agents** find it through the brand schema section \`init\` added to \`AGENTS.md\` (and \`CLAUDE.md\` or Copilot's instructions, where they exist). For other tools, see *Use your schema in AI tools* on the dashboard.
- **Check copy against the rules:** \`npx ramoira check --surface <surface> <file>\` (for example \`--surface social_organic\`). Exact and structural rules need no key or account; rules that need judgment use your own model key.
- **Check the file against the spec:** \`npx ramoira validate\`.
- **In CI:** create a token on the dashboard and set \`RAMOIRA_TOKEN\`. A token can push and pull; only you, signed in, make a version public.

## Keeping this folder current

Run \`npx ramoira init\` again to refresh \`DRAFTING.md\`, \`spec/\` and this page. It never touches your schema. When a command says \`DRAFTING.md\` is out of date, this is what it means.

---
Installed by \`ramoira init\` (CLI ${versions.cli}): brand schema spec ${versions.spec}, drafting protocol ${versions.drafting}.
`;
}
