# Task identity: the Book name

[Project model](../concepts/project-model.md) · [Task Books](task-books.md) · [References](../book-language/references.md)

A task is identified by its **normalized first nonempty name line**, exactly like agents and chats. There is no extra TASK ID, UUID, generated slug or filename-based logical key. File basenames may be arbitrary. Task names need not be enforced unique: the shared resolver deterministically selects one Book with a given normalized name and shadows competing copies. Source collisions are reported to Fixer, not merged or automatically renamed.

Create human-readable distinct names for new work, including meaningful disambiguation where needed. Merely copying a Book with the same name does not create a separately addressable task. A source move retains identity; **changing its first-line name changes identity**, requiring explicit reconciliation of references, prior results and trace history. Never redirect an old reference to a newly winning duplicate without diagnosis.

Git source revisions and human-readable `Task-Name: <declared name>` commit trailers correlate operations and preserve historical provenance without becoming new IDs. Recurring occurrences and retries are separate *events* under that same task, not separate entity identities. Root evidence lives in `traces/<name-key>/`, where the path component is derived deterministically and safely from the normalized name, not allocated as an opaque ID. Retain history when a task is intentionally renamed.

Legacy `TASK ID` declarations and Markdown `ptbk-task-id` comments may be read as historical metadata during compatibility/migration, but are not authoritative and are never newly generated. Read-only discovery does not mutate sources. See [traces](traces.md), [migration](migration.md) and [Git persistence](git-persistence.md).
