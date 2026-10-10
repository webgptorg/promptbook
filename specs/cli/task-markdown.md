# Legacy Markdown tasks

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

## Loading and states

Load only top-level `.md` files from the legacy source. Ignore README according to the existing rule and files containing `<!--ptbk-coder-ignore-->`. Do not recurse into archives, traces, templates or screenshots.

The legacy parser splits a file on a standalone `---` line. Each nonempty section is a separate task. Its state is determined by the first nonempty line, rather than an acceptance-criteria checklist in the body. The original parser is not a full Markdown AST; compatibility fixtures must cover its behavior. The rewrite must not redefine existing section boundaries without explicit migration.

| Marker | Normalized state | Automatic new execution |
| --- | --- | --- |
| `[ ]` | `todo` | Yes, if all other conditions are satisfied. |
| No marker | `todo`, priority 0 | Yes, if the section is complete; add a status line when starting. |
| `[-]`, historical `[.]` | `not-ready` | No. |
| `[^]` | `in-progress` | No; only explicit verified recovery. |
| `[x]`, `[X]` | `done` | No. |
| `[!]` | `failed` | No; requires deliberate retry/recovery. |

A known marker with invalid control metadata must not fall back to implicit `todo`. A section containing the authoring placeholder `@@@` must not execute. An ordinary leading emoji tag is not a task state.

## Priority and routing

The number of `!` characters in status metadata determines a nonnegative priority; higher values run first. On ties, preserve stable ordering by source path and section order. **New decision:** explicitly document the stable secondary key `normalized relative path + section/ID` for a mixed queue, so results do not depend on filesystem ordering.

Non-time backtick tokens form the historical **any-of** group. Compare a normalized token as a substring of the harness name, model name and selected Book agent's aliases. For example, `gpt` or `opus` is not a strict model ID. Multiple tokens mean OR, not a requirement to satisfy all of them.

```markdown
[ ] !! use `gpt` `claude`

[title or emoji] Fix CSV export
Preserve column names and add verification of quoting.
```

The legacy Markdown routing filter does not itself change the selected provider. On a status update, preserve original routing and time annotations as source metadata separate from the history of the runner used; a historical model in a completed report must not become a new restriction.

## Source changes during work

The adapter must know the file, section, content version and control-line location. Revalidate state before writing. It may preserve intentional task-owned body changes, but must not overwrite a concurrent edit, assign a result to a newly inserted section by index alone or ignore the original task's disappearance.

**New decision:** compare source revisions using a content hash and the expected task/section fingerprint. A conflict stops finalization and preserves both versions for resolution. Preserve newline style and surrounding content where compatible with an explicit normalization step.

## Related specifications

- [Task Books](task-books.md)
- [Task eligibility](eligibility.md)
- [Not-before: earliest start](not-before.md)
- [Migrating Markdown tasks to Books](migration.md)
- [Mutation lease, journal and recovery](recovery.md)
