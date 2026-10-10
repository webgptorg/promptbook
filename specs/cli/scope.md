# Product scope

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

## Included workflows

- Project initialization; task authoring, templates and planning conversations.
- A finite queue run, a read-only overview and dry-run.
- Repairing failing checks without running the ordinary queue.
- Safe Git commits, explicit pull/push, task isolation in a worktree and recovery.
- A persistent task supervisor and dashboard with shared state and controls.
- The seven existing harnesses, agent Books, context and TEAM.
- Tasks in Book format, Markdown migration, not-before and deterministic recurrence.
- Manual result verification and archiving; helper commands for authoring and diagnostics.

## Product boundary

Promptbook's sole product is the `ptbk` CLI. Initialization, task authoring, planning, execution, checks, verification and persistent supervision are workflows of this utility. Book parsing, agent context, harness adapters and the local dashboard support those workflows.

The historical pipeline engine, standalone Agents Server, Studio, library/browser exports, marketing websites, customer billing, Supabase/PostgreSQL, custom editors and general chat applications are outside this product specification.

`ptbk server` is the CLI's persistent task supervisor and local dashboard, defined in [persistent mode and dashboard](server.md). The historical unified Agents Server/SQLite proposal (PRD 2026-09-0490, explicitly `not-ready`) does not define this command or expand the product scope.

Deferred CLI features include parallel task workers, natural-language/event triggers, distributed coordination across clones, installation of reusable agent definitions and automatic backlog derivation from arbitrary goals.

**Task dependencies:** the APT concept allows them, but the current task PRD does not define an executable contract such as `DEPENDS ON`. The base version must not invent an implicit DAG or new syntax. The eligibility interface must allow a future dependency evaluator; unsupported control syntax must visibly block the task today. Dependencies between the [implementation stages](delivery.md) are not task syntax.

Origami avatars from PRD 2026-10-0030 describe an optional CLI presentation extension using shared events. Promptbook must have a replaceable identity/status renderer and a compatible fallback. Physical 3D origami folding and changes to Agents Server are outside the CLI product scope. Their exclusion from the base delivery must be visible and must not be presented as a completed PRD.

## Related specifications

- [Core concepts and data contracts](domain-model.md)
- [Implementation stages and Definition of Done](delivery.md)
- [Compatibility and deliberate changes](compatibility.md)
