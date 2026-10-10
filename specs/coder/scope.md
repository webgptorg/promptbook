# Coder scope

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

## Included workflows

- Project initialization; task authoring, templates and planning conversations.
- A finite queue run, a read-only overview and dry-run.
- Repairing failing checks without running the ordinary queue.
- Safe Git commits, explicit pull/push, task isolation in a worktree and recovery.
- A persistent coder server with shared state and controls.
- The seven existing harnesses, agent Books, context and TEAM.
- Tasks in Book format, Markdown migration, not-before and deterministic recurrence.
- Manual result verification and archiving; helper commands for authoring and diagnostics.

## What must stay outside the core

The old pipeline engine, the entire Agents Server, Studio, marketing websites, customer billing, Supabase/PostgreSQL, a custom editor and general chat features are not coder dependencies. Do not rewrite all of Promptbook for the coder.

Deferred features include the full `ptbk server` over Agent Server and SQLite (PRD 2026-09-0490 is explicitly `not-ready`), parallel task workers, natural-language/event triggers, distributed coordination across clones, an agent marketplace and automatic backlog derivation from arbitrary goals.

**Task dependencies:** the APT concept allows them, but the current task PRD does not define an executable contract such as `DEPENDS ON`. The base version must not invent an implicit DAG or new syntax. The eligibility interface must allow a future dependency evaluator; unsupported control syntax must visibly block the task today. Dependencies between the [implementation stages](delivery.md) are not task syntax.

Origami avatars from PRD 2026-10-0030 are a separate visual deliverable using shared events. The coder must have a replaceable identity/status renderer and a compatible fallback. Physical 3D origami folding and changes to Agents Server are not prerequisites for task-engine correctness. Their exclusion from the base delivery must be visible and must not be presented as a completed PRD.

## Related specifications

- [Core concepts and data contracts](domain-model.md)
- [Implementation stages and Definition of Done](delivery.md)
- [Compatibility and deliberate changes](compatibility.md)
