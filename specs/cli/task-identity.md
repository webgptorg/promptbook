# Task identity: the Book name

[Project model](../concepts/project-model.md) · [Task Books](task-books.md) · [References](../book-language/references.md)

A task is identified by the **normalized name content of its opening `TASK <name>` commitment**, just as AGENT and CHAT name their respective entities. TASK itself is not part of the name or an additional namespace. There is no extra TASK ID, UUID, generated slug or filename-based logical key. File basenames are storage choices. Task names need not be enforced unique by the language: the shared resolver deterministically selects one Book with a given normalized name and shadows competing copies. Source collisions are reported to Fixer, not merged or automatically renamed.

Every newly system-created task follows [generated-name policy](generated-names.md): a readable title plus creation date/time, checked for distinction after normalization and further disambiguated when necessary. This covers add, initialization, saved plans and all engine/agent-generated work, not only model-authored tasks. Date/time is ordinary name content, not another key or a requirement for an otherwise valid existing task. Merely copying a Book with the same name does not create a separately addressable task.

A source move retains identity; **changing the declared name changes identity**, requiring explicit reconciliation of references, prior results and trace history. Never redirect an old reference to a newly winning duplicate without diagnosis. Generated dates are not stripped during matching, and an existing task is not renamed when executed, retried, completed, recovered or converted to canonical syntax.

Git source revisions and human-readable `Task-Name: <declared name>` commit trailers correlate operations and preserve historical provenance without becoming new IDs. Recurring occurrences and retries are separate events under that same task, not separate entity identities.

Evidence storage is deliberately **filename-based**, independently of logical identity: `traces/<task-file-basename>/` uses the actual source filename literally without its final `.book` (or legacy `.md`) extension. It is not a normalized TASK name or a generated audit key. Keep the declared name and source path/revision in evidence so differently named Books and files remain attributable. A basename rename changes the evidence destination, not the task identity; changing the declaration alone does not rename that directory. Preserve and reconcile existing evidence and occupied destinations under [trace rules](traces.md).

Legacy `TASK ID` declarations and Markdown `ptbk-task-id` comments may be read as historical metadata during compatibility/migration, but are not authoritative and are never newly generated. Read-only discovery does not mutate sources. See [traces](traces.md), [migration](migration.md) and [Git persistence](git-persistence.md).
