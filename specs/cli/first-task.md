# First runnable task

[Main specification](../_main.md) · [Initialization](initialization.md)

The first initialization of Promptbook support in a project creates a small, safe test task so that `init` followed by plain `start` demonstrates real agent work. It is an unfinished runnable task in the configured task source, not a disabled boilerplate, sample text outside the queue or an already-completed demonstration.

Give it a clear title and bounded, project-local outcome: inspect the initialized project and record a short readiness summary without changing its purpose or implementing unrelated features. Use the ordinary selected harness, configured checks, completion stamp and result commit. Require no extra credentials, deployment, external side effects or manual task configuration. Assign an existing ordinary agent or let automatic Manager assignment resolve missing routing; do not reference an unavailable example agent/model.

Basic init saves this task with the setup artifacts but does not execute it or call a model. Start executes it through the normal lifecycle and shows its actual agent, progress and outcome. Do not bypass checks or mark it complete merely because the daemon started. It obeys queue ordering and ownership; it must not erase, complete or reorder existing user tasks just to force a demonstration.

A first intent-driven Expert task fulfills this purpose without an additional generic test task. Repeating or resuming init recognizes an existing starter or its recorded completion and never duplicates, reopens or resurrects it, including after ordinary archiving. Preserve user edits. Once a project has passed its initial starter workflow, routine initialization or upgrade is not a request to generate more test work.

See [Task Books](task-books.md), [Manager](../agents/manager.md) and [checks](checks.md).
