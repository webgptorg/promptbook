# Ordinary and system tasks

[Main specification](../_main.md) · [Task Books](task-books.md) · [Eligibility](eligibility.md) · [Engine updates](updates.md)

There are **ordinary tasks** and **system tasks**. Ordinary project tasks have the source-backed Book/Markdown representations defined elsewhere. A system task's definition belongs to the engine and need not have a project Book. Self-update is a system task. Its implementation may be deterministic engine code rather than an LLM-backed agent; this is not a fourth project entity or a second scheduler.

Do not introduce a third **core task** category. A task performed by Router, Teacher, Fixer, Chatter or another core agent remains ordinary agent work. Core provenance, executor and purpose can be shown without creating a different task kind. Core agents themselves are ordinary editable project agents whose required initial presence is prepared by the engine.

## Shared scheduling and observation

Both task kinds expose the applicable common properties: human-readable description, origin/kind, priority, conditions/dependencies, state, progress, outcomes and actual executor. Keep the durable task definition distinct from each occurrence/run and each retry. Recurrence, prerequisites and other conditions remain expressible in the common model. Source-backed tasks retain their existing normalized Book-name identity; engine-owned system definitions must not be fabricated as project Books, generated Book IDs or renamed agents.

Use the same eligibility, priority, shared capacity, lifecycle and recovery mechanisms for both kinds, with explicit task-specific conditions where needed. A deterministic system task need not be routed to an agent or require a MODEL merely to appear in the queue. An update can require an idle installation; that condition belongs to the task, not a separate update scheduler. Manual pause/stop prevents automatic system work just as it prevents ordinary background work. Inspecting a pending task never runs it.

CLI/dashboard/App consumers use one task inventory, detail and event model. A kind label is sufficient; no separate system-task window or knowledge of whether an LLM executes it is required. Show the actual executor or system implementation honestly. A system task without a source has no fictitious editable Book or source-filename trace directory. Its runtime evidence remains attributable to its definition/run; the existing filename-based trace contract continues for tasks that actually have project sources. Transport identity and concrete API mapping are a shared integration-design decision.

## Persistence and effects

The engine-owned definition need not be committed to each project. Actual changes it makes to versioned project files still use ordinary scoped [Git persistence](git-persistence.md). A deterministic update/migration uses a system operation subject, without inventing an agent author. Configuration, Book or package-file migrations record their actual changes; ignored runtime state, credentials and external services do not become backed up merely because Git exists.

Use ordinary [cause-aware recovery](retries.md) and reconcile uncertain effects before retry. Do not mark a task/run complete merely because a helper started, a connection disappeared or an install command returned without verifying the resulting state.

Acceptance: list an ordinary recurring task and a pending update through the same inventory/details/events; distinguish definitions, runs and retries. Higher-priority work can defer the update indefinitely without blocking ordinary intake. No core-task type, project update Book, invented agent or separate scheduler is introduced; effects on versioned files retain scoped system audit commits.
