# Stable task identity and audit correlation

[Main specification](../_main.md) · [Task Books](task-books.md) · [Traces](traces.md)

Every task has a unique, durable task ID distinct from its title, filename, position, selected agent and commit hash. It connects task source, execution state, Git history and `traces/<task-id>/`. Titles may repeat; identical titles must never merge histories.

Persist a generated ID when creating a task, including initialization's Expert task, add, Manager/Teacher/discovery work and follow-ups. For legacy or manually authored tasks without an ID, assign and save one in a scoped preparation/authoring operation before first execution, not during read-only discovery, list or dry-run. No separate user naming step is required. Preserve an existing valid ID; diagnose duplicates or invalid/path-unsafe explicit IDs rather than silently selecting or renumbering a task.

Task Books store the ID with `TASK ID`. Markdown task sections retain an equivalent readable `<!-- ptbk-task-id: <id> -->` metadata comment associated with the section, separate from its status control line and description. Preserve the ID during conversion between supported task formats. Identity must not depend only on a mutable section index or an uncommitted runtime cache.

IDs remain unchanged across title/content edits, source moves, assignment changes, retries, completion, archiving and safe recovery. A copied definition intended as new work receives a new ID. Recurring tasks retain their task ID; each occurrence and each attempt has a distinct subordinate reference in execution records and traces. Child/follow-up tasks have their own IDs with parent/origin relationships.

Every automatically created commit attributable to a task includes its exact ID in a `Task-ID: <id>` message trailer. This covers creation, assignment, results and any task-scoped repair, recovery or integration commits, whether traces are committed or ignored. A commit involving several tasks lists their IDs without confusing generated follow-ups with the executing parent. Preserve the `PTBK: <task title>` result subject and descriptive body; the ID is additional correlation metadata, not a replacement for the assignment. System operations with no associated task need no invented task ID.

The directory `traces/<task-id>/` uses that same filesystem-safe ID. Task inspection and runtime/API results expose it consistently, including when no result commit exists yet. Multiple occurrence/result commits remain linked to the one task while being individually distinguishable. Uncommitted work retains its ID and local trace links without a fabricated SHA; reverts never make an ID identify another task or erase knowledge of an external effect.

See [TASK ID](../book-language/commitments/task-id.md), [references](../book-language/references.md), [recurrence](recurrence.md) and [Git persistence](git-persistence.md).
