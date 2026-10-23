# Automatic repair is a core product principle

[Main specification](../_main.md) · [Unattended operation](../cli/autonomous-operation.md) · [Fixer](../agents/core-agents/fixer.md) · [Core agents](../agents/core-agents.md)

**A started project should solve ordinary problems itself and involve the user as little as necessary.** This is a central system contract across configuration, migrations, tool availability, execution, persistence and synchronization, not a footnote in the definition of a maintenance agent. An alive engine that repeatedly waits for routine decisions does not satisfy this principle.

## Common problem-handling path

Detect a problem with its actual context, affected work, available evidence and attempted recovery. Apply safe deterministic corrections and bounded technical retries where their meaning is clear; do not spend a model call on every case-normalization or transient reconnect. Unresolved or judgment-dependent problems are handed to **Fixer** through ordinary agent work. Every subsystem can use this path rather than inventing its own human escalation subsystem.

Examples include configuration normalization collisions, failed migration steps, unavailable tools, recurring crashes, failed checks, persistence errors and merge conflicts. Routine conflict-free merges and exact known configuration transformations are deterministic operations. Fixer handles problems requiring project knowledge or judgment, including broader project problems, not only engine internals. Its mere involvement is not a reason to ask a person.

Fixer examines the context, can consult other agents and resolves authorized issues itself when evidence is sufficient. When it genuinely needs help, it asks its team, which includes User by default. This uses the normal TEAM/agent mechanism. This contract does not add a Fixer-specific question API, interactive wizard or communication channel; the channel carrying a question is outside this mechanism's scope.

## Ordinary, customizable agent policy

Fixer is required because the engine expects a problem-solving role in every project and routes certain failures to it. It is otherwise an ordinary editable core agent with ordinary Book instructions, TEAM, routing, learning and Git persistence. Other agents may consult Fixer; Fixer may consult them.

Initialize it with a small understandable Book, a general goal of solving problems and offloading decisions from the user, and TEAM access to User and Expert. Its default OPEN learning may retain verified user problem-solving preferences through the ordinary Teacher mechanism. Do not reset its learned policy on reinit or engine upgrade.

Minimal user involvement is the **default Book policy**, not a hardcoded escalation policy that overrides the project's instructions. Users may require all decisions to be consulted, specify detailed consultation rules, or remove User from Fixer's team and instruct it not to ask. Such customization does not grant authority to invent approvals, spend outside authorized limits, discard data or conceal an unresolved problem. A problem outside the remaining authority stays visible and recoverable.

## Safe progress and honest limits

Keep repair attempts bounded, retain useful diagnostics, deduplicate the same outstanding problem and avoid recursive repair loops. Repairs use the project's ordinary single-task/consultation ownership rules, not a second concurrent worker. Preserve the interrupted work and resume the correct phase without repeating completed external effects. Versioned repairs commit only their own changes; runtime-only recovery does not manufacture a commit.

A failed remote synchronization does not stop safe local work. Missing usable tools do not mean the engine has exited: report the wait, continue inspection/rechecking and use newly available resources without restart. Fixer also needs usable execution resources; if none are available, retain the repair context and explain the blocker instead of pretending an agent ran or launching an endless fallback loop. Read-only commands remain read-only.

Distinguish task-local problems from project-wide unsafe state. Continue independent work when ownership can be preserved; do not hide unsafe unresolved state to claim progress. Deliberate pause/stop and explicitly disabled tools remain intentional decisions, not errors to undo automatically. The user may also resolve problems manually; recognize the result and retire stale repair requests.

## Acceptance outcomes

Resolve unambiguous naming corrections without a human question and retain their scoped commit. Send a genuine ambiguity or difficult merge conflict to the normal Fixer; verify ordinary specialist/User consultations, learned preferences and no new communication mechanism. Exercise customized all/some/no-User consultation policies without resetting the Book. Recover from a transient fault without duplicate effects or repeated notifications. With no usable harness, keep the engine controllable and the repair pending; adding a usable tool enables recovery without a restart.

Detected Book problems, including unknown/misspelled commitments and invalid MODEL content, warn without preventing the user from saving. Preserve source and isolate affected execution; use a separate ordinary Fixer task rather than a fatal engine error. Persistent Router/Tasker failure follows this same path. Fixer's default Book asks before changing explicit user intent, but that caution is editable agent policy, not a new hardcoded engine restriction.
