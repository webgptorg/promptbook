# Task Books

[Main specification](../_main.md) · [Book language](../book-language/_index.md)

A task is a bounded unit of work written primarily in natural language. Its first nonempty line is `TASK <title>`, followed by the description and any commitments. It is not an agent, does not inherit Adam and needs neither an artificial agent-name line nor a mandatory PROMPT wrapper.

```book
TASK Improve CSV export

Preserve column names and correctly quote cells containing commas or newlines.
Add a regression test.

TASK ID csv-export-01
TASK AGENT @Developer
TASK PRIORITY 2
TASK AFTER 2026-10-30T09:00:00+01:00
RULE Do not change the public export interface.
```

Titles need not be unique. Every task receives a stable [task ID](task-identity.md), persisted with `TASK ID`, connecting its source, commits and `traces/<task-id>/`. Authoring generates it for new tasks; an existing source lacking an ID receives one through scoped preparation before execution, without renaming its title. Read-only inspection never assigns IDs or rewrites source. Preserve identity through edits, moves, retries, completion and archiving. References, relationships, routing and state use [task commitments](../book-language/commitments/_index.md).

[Authoring](authoring.md), including `ptbk add`, commits a new task by default before making it available for dispatch. A creation commit is not completion. On successful execution append `TASK DONE <timestamp>` in the same result commit as accepted changes, generated follow-ups and policy-eligible traces. It records when work finished, not merely that the agent stopped speaking. For a one-time task this is the completion marker. Repeated work has occurrence-specific completion under [recurrence](recurrence.md). Explicit uncommitted mode follows [Git persistence](git-persistence.md) and never claims a result commit exists.

The result subject is `PTBK: <task title>` and the body preserves the descriptive assignment; include the task's exact ID as additional `Task-ID: <id>` metadata, not a replacement for that description. Do not add the commit prefix to the task's source title. Preserve natural text, literal blocks, references, Unicode, assets and unrelated metadata during edits. Malformed control commitments must not silently make a task runnable.

[Initialization's first Expert task](first-task.md) uses this same format and lifecycle, references the preserved initial specification and can create ordinary follow-ups with distinct IDs. It is not a special task type.

See [task relationships](task-relationships.md), [eligibility](eligibility.md), [Markdown tasks](task-markdown.md), [traces](traces.md) and [Git persistence](git-persistence.md).
