# Deprecated commitment keywords still live inside other commitments' `documentation` examples

While removing deprecated commitments from the Book language manual
(`prompts/…-improve-book-language-manual.md`), the catalog part was straightforward — the manual now
skips every commitment group whose `getCommitmentNoticeMetadata(...)` says `deprecated`, so
`TEMPLATE`, `PERSONA`, `STYLE`, `FORMAT`, `SAMPLE` and `ACTION` no longer have their own entries.

**But deprecated keywords are still taught by the manual indirectly**, because many
_non-deprecated_ commitments use them inside their own `documentation` examples. For example
`src/commitments/KNOWLEDGE/KNOWLEDGE.ts`, `src/commitments/RULE/RULE.ts`,
`src/commitments/WRITING_RULES/WRITING_RULES.ts` and `src/commitments/MODEL/MODEL.ts` all contain
example books starting with:

```book
Customer Support Agent

PERSONA You are a helpful customer support representative
RULE Always ask for clarification if the user's request is ambiguous
```

Since `documentation` is the single source of truth rendered by the manual, `/docs/<TYPE>` pages, and
the editor tooltips, a reader is shown `PERSONA` as normal, recommended syntax right next to the
statement that `PERSONA` is deprecated in favour of `GOAL`.

## Why it was not fixed here

The prompt asked only for the manual, and this is a repository-wide content change across roughly
**30 commitment definition files** — each with its own `documentation` getter and its own
`*.test.ts` asserting parts of that text. Doing it as a side effect of the manual task would have
made the diff unreviewable and would have touched commitments the prompt never mentions.

## Suggested fix

Sweep `src/commitments/**/*.ts` and rewrite the example books in every `documentation` getter to use
the current replacement keyword of each deprecated commitment:

| Deprecated | Replacement                     |
| ---------- | ------------------------------- |
| `PERSONA`  | `GOAL`                          |
| `STYLE`    | `WRITING RULES`                 |
| `FORMAT`   | `WRITING SAMPLE`/`WRITING RULES`|
| `TEMPLATE` | `WRITING SAMPLE`/`WRITING RULES`|
| `SAMPLE`   | `WRITING SAMPLE`                |
| `ACTION`   | a concrete `USE*` commitment    |

A regression test asserting that no `documentation` of a non-deprecated commitment contains a
deprecated keyword would keep it that way. The replacement mapping already exists at runtime in
`CommitmentDefinition.deprecation.replacedBy`, so the test can be written without a second hardcoded
table.
