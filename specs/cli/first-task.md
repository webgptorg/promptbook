# First runnable task

[Main specification](../_main.md) · [Initialization](initialization.md)

The first initialization creates one ordinary unfinished task in the configured task source. Its purpose is to turn the technically initialized project into the project described by the user's initial specification. The initializer prepares support; this task creates project-specific content. It is the same kind of task as one saved by `ptbk add` or authored directly in a task file, not a privileged bootstrap execution path.

## Source and assignment

Start its Book with `TASK <name>`, assign it explicitly with `TASK AGENT @Expert`, and link to the initialized project's `specs/_initial.md`. Use a clear descriptive name plus creation date/time under [generated-name policy](generated-names.md), checked after normalization rather than allocating another task ID. Resolve the link correctly even when the task source is customized. Expert comes from the running engine, understands Promptbook and is never materialized as a project agent.

Generate the title and assignment in English. Put the assignment under GOAL using the common Book syntax. The essential instruction is: "Transform this project according to the initial specification in `specs/_initial.md` and its linked assets. Preserve the original specification; create or adapt the project content, agents, checks and follow-up tasks needed to fulfill it."

The linked specification, not a rewritten copy embedded in the task, is the source of the user's intent. Its original text and attachments remain intact. Expert can write additional specifications or other project files without replacing that source. This applies equally to an application, accounting agenda, publishing workflow or another project purpose.

For deliberately blank input, the same Expert task performs a small project-local readiness review without inventing a purpose, requesting extra credentials or causing unrelated external effects. Do not create a second generic test task alongside the bootstrap task. Existing content and user work remain protected.

## Normal execution

Save the task with the setup artifacts before the service may claim it. Successful init automatically starts the background agenda, which begins eligible work without an open dashboard or another command. Init itself does not call a model or execute the bootstrap inline; the daemon does not wait for the wizard to become a dashboard.

Use normal routing constraints, selected harnesses, checks, repairs, completion stamps, [traces](traces.md) and result commits. Do not mark the task complete because initialization or daemon launch succeeded. The task's accepted changes, completion and generated follow-ups share its ordinary result commit. Follow-ups receive their own generated names and use normal scheduling; they do not need a second initialization or manual Run action.

Respect queue ordering and ownership in an existing project. Do not erase, complete or reorder user tasks merely to force a demonstration. The new empty project's bootstrap is its initial eligible work.

Repeating or resuming init recognizes the saved starter or its recorded completion and never duplicates, reopens or resurrects it, including after archiving. Preserve user edits and the original task name and Git history; do not refresh its name's date/time. Once initial bootstrapping exists, routine upgrades are not requests for another bootstrap. A failed launch resumes the queued task through start; a failed task uses ordinary recovery rather than regenerating it.

See [Task Books](task-books.md), [Expert](../agents/expert.md), [execution](execution.md) and [start](start.md).
