# Task Books

[Project model](../concepts/project-model.md) · [Syntax](../book-language/syntax.md)

An ordinary source-backed task is bounded work stored in one `.book` document. It starts with **`TASK <name>`**, the foundational commitment that declares both kind and name using the common Book syntax. The name content is its identity; TASK, its folder and its filename are not part of that identity. There is no separate generated task ID. Plain name headers and ENTITY TASK are legacy conversion inputs, not canonical new authoring. Engine-defined [system tasks](system-tasks.md) share scheduling and observation but need not have a project Book; work performed by core agents remains ordinary task work with descriptive core provenance. Project-relative [TASK PURPOSE](../book-language/commitments/task-purpose.md) is independent of both definition ownership and agent provenance.

```book
TASK Improve CSV export — 2026-10-18 01:25:00
GOAL Preserve column names and correctly quote cells with commas or newlines.
Add regression tests.
TASK AGENT @Developer
MODEL harness=OPENAI_CODEX model=*
TASK PRIORITY 2
TASK AFTER 2026-10-30T09:00:00+01:00
LINK {Discuss CSV requirements — 2026-10-18 01:24:00}
RULE Do not change the public interface.
```

Titles can collide. The common resolver picks one normalized-name winner, never merges definitions; shadowed files prompt diagnostics. All newly system-created tasks proactively include date/time in their readable names and check the final normalized candidate under [generated-name policy](generated-names.md). The example illustrates that policy, not mandatory date syntax: an otherwise valid `TASK Improve CSV export` remains valid. Renaming the declared name changes logical identity and needs explicit reference/history reconciliation. Changing the filename alone preserves logical identity, but a basename change affects the task's source-filename-based [trace directory](traces.md) and requires preserving its evidence provenance and path links.

Subsequent commitments build the task's work, constraints and metadata. Put descriptive work under an appropriate commitment such as GOAL, rather than extending the single-line name. Task commitments define owner, dependencies, state and scheduling; LINK supplies optional directed references including many-to-many task↔chat edges, **not** execution dependencies. TASK AGENT is one multiword commitment, not another TASK declaration. Task Books do not inherit Adam. Shared MODEL uses the same alternatives/filter syntax as agents and chats; Router specializes it in place, with earlier values retained in Git rather than duplicate task metadata.

`ptbk add` saves and commits a new unfinished task before dispatch. Creation is not completion. An accepted task or occurrence appends `TASK DONE <timestamp>` in its **one result commit**, together with checked changes, follow-ups and eligible traces. Result subject follows the [agent-work format](git-persistence.md#commit-messages-and-history): lowercase `ptbk: `, the responsible agent's backtick-quoted textual visual and meaningful task subject; body preserves the assignment and a `Task-Name: <name>` trailer instead of a Task-ID. Follow-ups receive their own creation-time-decorated names and normal scheduling. The initial Expert bootstrap is an ordinary task under these rules. Retries and recurring occurrences retain the same task name instead of refreshing its date.

See [task identity](task-identity.md), [relationships](task-relationships.md), [recurrence](recurrence.md), [authoring](authoring.md) and [Git persistence](git-persistence.md).

## Purpose and supporting work

The author classifies new work as CONTENT or SYSTEM where context supports it, or leaves it undefined. Router and the executing agent may refine it. Append changed TASK PURPOSE commitments, preserving earlier values in the Book and using the last valid value; this differs from MODEL's in-place refinement contract. A discovered technical prerequisite normally becomes a separate linked system-purpose task, preserving the original content goal. Follow [contextual purpose knowledge](../concepts/minimal-interruption/work-purpose.md) rather than classify by keywords or executor alone.
