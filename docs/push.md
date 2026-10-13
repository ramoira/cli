# ramoira push, ramoira pull

Upload a version for the owner's review, and bring the reviewed version back. Free; needs a free account (`ramoira login`).

```
ramoira push [file] [--slug <slug>]
ramoira pull [file] [--slug <slug>] [--force]
```

It works like git: `push` is a branch waiting for review, the owner's review on ramoira.com is the pull request, and `pull` brings the result back.

## push

1. Checks the file locally: a valid 3.x full schema with an up-to-date `content_hash`. If not, it says why, with no network call.
2. Sends it, with the reviewed version it is based on, to `ramoira.com/api/brands/<slug>/proposals`. `--slug` names the brand the first time and sets `ramoira.brand_id` (outside `content_hash`).
3. Ramoira keeps it privately. **Nothing becomes public.** The owner sees it on their dashboard.

```
✔ Pushed. Nothing is public.
  The slug "your-brand" is now yours. It is never given to anyone else.

  The owner reviews it here, signed in: https://ramoira.com/dashboard/your-brand/review
  Version 0.1.0 · sha256:eaed480d372b…
```

A push is refused when it is **out of date** (the owner has reviewed a newer version than this file's base: run `pull`, then make the change again), or when it **claims an affirmation the owner never made** (a rule `"affirmed": true`, a brand-judged example or a field `affirmed` that is not in the reviewed base). A token or an agent can push; only the signed-in owner makes a version public.

After a push, `ramoira/sync.json` records it and the file's `workflow_state` reads `in_review`.

## The review (on ramoira.com)

The owner affirms, edits or deletes each rule, keeps or rewrites each proposed field, chooses the version label, and then presses **Make public** or **Send back to your agent** with requests. Ramoira applies the decisions as the owner's words, without a model.

## pull

Writes the last reviewed version into the file, with the owner's decisions, and records it as the base in `ramoira/sync.json`. If the owner sent it back, their requests go to `ramoira/REVIEW.md`; ask your agent to make those changes, then push again. `pull` refuses to overwrite changes that were never pushed; `--force` replaces them.

## Where the file stands

`ramoira status` says whether your file is the public version, waiting for review, changed since the last push, or behind a newer version the owner reviewed or made public (for example after **Revise** on the dashboard).

## `ramoira publish`

Retired in 0.4.0. Making a version public is the owner's act in the review, because an agent holds every credential the CLI does.
