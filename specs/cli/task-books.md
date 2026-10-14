# Task Books

[Main specification](../_main.md) · [Book language](../book-language/_index.md)

A task is a bounded unit of work written primarily in natural language. Its first nonempty line is `TASK <title>`, followed by the description and any commitments. It is not an agent, does not inherit Adam and needs neither an artificial agent-name line nor a mandatory PROMPT wrapper.

```book
TASK Improve CSV export

Preserve column names and correctly quote cells containing commas or newlines.
Add a regression test.

TASK AGENT @Developer
TASK PRIORITY 2
TASK AFTER 2026-10-30T09:00:00+01:00
RULE Do not change the public export interface.
```

Titles need not be unique. A task's stable reference distinguishes it from another task with the same title; the engine can supply `TASK ID` when needed without renaming the title. Read-only inspection does not assign IDs or rewrite source. References, relationships, routing and state are written as [task commitments](../book-language/commitments/_index.md).

[Authoring](authoring.md), including `ptbk add`, commits a new task by default before making it available for dispatch. A creation commit is not completion. On successful execution append `TASK DONE <timestamp>` in the same result commit as accepted changes and generated follow-ups. It records when work finished, not merely that the agent stopped speaking. For a one-time task, this stamp is the completion marker. Repeated work has occurrence-specific completion under [recurrence](recurrence.md). Explicit uncommitted mode follows [Git persistence](git-persistence.md) and must not claim a result commit exists.

The result subject is `PTBK: <task title>` and the body preserves the descriptive assignment; execution metadata is not substituted for it. Do not add the commit prefix to the task's source title. Preserve natural text, literal blocks, references, Unicode, assets and unrelated metadata during edits. Malformed control commitments must not silently make a task runnable.

See [task relationships](task-relationships.md), [eligibility](eligibility.md), [Markdown tasks](task-markdown.md) and [Git persistence](git-persistence.md).
