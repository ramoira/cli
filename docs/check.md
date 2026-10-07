# ramoira check

Check content against your brand schema's rules. Free, local, no account.

```
ramoira check [items...] --surface <surface>

Arguments:
  items                     Files to check, one item per file (an email, a post, a product description…).
                            Use - or pipe text in to check stdin.

Options:
  -s, --surface <surface>   Where the item will appear (required): one of the spec's surfaces,
                            e.g. product_detail_page, social_organic, email_retention
  -m, --market <code>       The market the item is for; rules scoped to markets need it
  --schema <path>           Schema to check against (default: ramoira/brand.schema.json)
  --producer <id>           Who produced the item
  --producer-class <class>  agency, freelancer, internal_team, in_house_ai or other (default: other)
  --brand                   You are the brand, checking a producer's work for your own review
  --json                    Print verdict events as JSON, no colour (for CI)
```

## What it does

`check` runs the spec's [open checker](https://github.com/ramoira/brand-schema-spec/tree/main/checker) over each item and reports what your schema's own rules find. For every finding it names the rule, quotes the span from the item as written, and stops. It never suggests a rewrite.

- **Exact rules** (forbidden words, competitor names, misquoted phrases) and **structural rules** (exclamation marks, sentence length, discount ceilings, required phrases) run deterministically. No model is involved.
- **Judged rules** ("never present the pan as a gadget") run on your own model key (`ANTHROPIC_API_KEY`). The model decides each rule from that rule's own examples and rails, quotes the item and cites the examples it relied on. If it can't, the finding is **void** and the item needs review. Without a key, judged rules are not run and the item needs review.
- Rules that cannot be decided here are listed as **not checked**, with the reason: rules for images or audio, structural checks that need judgment (such as "only approved claims"), rules scoped to a market you did not declare, and rules that apply only during a situation your brand activates.

## What you can and cannot choose

You declare facts: the item, where it will appear, its market, who produced it, and whether you are the brand. You cannot pick, skip or tune rules. Your schema decides which rules apply to the item. A check whose rules the checked party could adjust would not be a check.

## Results

| Verdict | Means |
|---|---|
| Pass | No absolute or strong violation, and every judged rule was judged |
| Fail | At least one absolute violation |
| Needs review | A strong violation, or a judged rule that could not be judged |
| Not certifiable | The schema is a candidate (not ratified) or a public summary. The findings verdict is shown alongside. |

Every result is **tooling only**. A check you run yourself is useful, but it is not an independent check, and it is not a certification. While your schema is a candidate, results say "Not certifiable" (the findings still show what would fail).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Every item passes |
| 1 | At least one item fails |
| 2 | No item fails, at least one needs review |
| 3 | Could not check (missing surface, unreadable or invalid schema, empty item) |

## In CI

```sh
ramoira check --surface email_retention --json emails/*.txt > check.json
```

`--json` prints one verdict event per item, in the open record format (`record.schema.json`), with the notes and the rules that did not apply.
