# Automatic Git synchronization

[Main specification](../_main.md) · [Synchronization setup](synchronization-setup.md) · [Git persistence](git-persistence.md) · [Automatic repair](../concepts/automatic-repair.md)

## Explicit opt-in, existing Git identity

Root-level `ptbk.json.isAutoSync` is the single saved switch and defaults to false. Migrated projects stay off unless they already contain an explicit canonical choice. With synchronization disabled, perform no automatic remote pull/push, run no synchronization timer and show no dedicated synchronization dashboard panel. Local commits and normal work remain available.

When enabled, use the selected repository's existing `origin` and the tracking destination for the branch on which this engine started. Read that information from Git, not duplicated JSON remote/branch settings. The engine does not routinely create, rename, check out or choose branches/remotes. New-repository init uses `main` and may configure publication through its explicit [setup step](synchronization-setup.md). Diagnose absent/ambiguous destinations without guessing, overwriting origin or stopping otherwise safe local work. An external branch switch requires safe ownership reconciliation, not silent continuation on a different project history.

`--auto-sync` and `--no-auto-sync` are invocation overrides. Legacy `--auto-pull`/`--auto-push` are explicitly documented compatibility opt-ins to this same combined synchronization capability, not separate persisted policies; explain that both directions are enabled. Contradictory overrides fail before mutation. Automatic synchronization requires committed operation and is incompatible with `--no-commit`.

## Timed and operation-boundary attempts

Use a default **60-second pull interval**, without adding a required user configuration question. In addition, always attempt pull before a new task or another logical mutating operation begins, and again before its local commit, regardless of the timer. This applies to authoring, tool/configuration changes and task results, not to every low-level file write. Push after completed local work/commits, including setup, tool changes and accepted repair results. Periodic/manual cycles also retry pending publication when no new task has completed.

These are attempts, not prerequisites of local progress. Network, authentication, missing remote or rejected-push failures must not stop otherwise safe local task execution or local commits. Keep pending synchronization with its real cause, latest attempt/success and next retry. Back off repeated failures within bounds and avoid tight loops. Coalesce concurrent timer, boundary and manual requests through one coordinator; do not run competing Git mutations or flood the remote with duplicate requests. Synchronization's own merge commit must not recursively trigger another pre-commit pull.

A pull is a fetch plus safe integration. Fetching may occur during work; integrating remote files may not overwrite active task/tool edits or alter files under a running check. At a pre-commit attempt with owned dirty work, preserve that work: safely reconcile when possible, otherwise record integration as deferred, commit only the verified local operation and integrate at the next safe boundary. Do not claim a successful integration when only fetch succeeded. Never automatically stash/drop unknown changes, reset the worktree or mix unrelated staging to make pull succeed.

After successful integration, refresh tasks, configuration version, tools and relevant readiness before selecting new work. If integration changes the content intended for a task result, rerun affected validation rather than commit an invalidated checked snapshot. New remotely authored tasks become ordinary eligible work. Tasks use the existing project working tree/current branch; there are no temporary task-worktree branches to publish.

## Visible merges and immutable history

Integrate fetched changes using a normal **non-fast-forward merge**: when remote changes need integration, retain a visible merge commit even if fast-forward would have been possible. An already up-to-date branch does not produce an empty merge commit. Never use rebase, squash, amend, destructive reset, force-push or another history rewrite as an automatic synchronization strategy. Preserve existing commits and both parents of real merges. Automatic merge/repair commits use the normal `PTBK: ` subjects and remain separate from task-result or tool-management commits.

Resolve ordinary conflict-free merges automatically. Problems needing judgment go to the ordinary **Fixer**, which may resolve straightforward conflicts using evidence and project policy or consult its team, including User by default, when necessary. Do not automatically make every conflict a human question or silently choose ours/theirs and lose work.

For a difficult merge, retain both histories and enough recoverable conflict context without leaving the sole working tree stuck in a half-merged state that unnecessarily prevents local tasks. Integrate in a safe coordinated context, or defer unresolved remote integration while restoring/preserving the exact pre-attempt local state. A genuinely unsafe shared-ownership problem may block affected work, but a failed synchronization alone must not stop local progress. Respect pause/stop when scheduling Fixer work.

Two different clones may accidentally execute the same task differently. Git synchronization is not a distributed execution lock and does not promise exactly-once external actions across machines. Preserve both results/provenance, surface task/occurrence conflicts to Fixer, and never replay payments/posts or erase one result merely to obtain a clean merge. Git history cannot undo external effects.

## Cockpit controls and acceptance

Only while synchronization is enabled, show a compact status panel with drill-down through the existing dashboard pattern. Details include redacted origin/branch, current phase, last attempt/success, known pending incoming/outgoing work, error/conflict/deferred-integration reason and next retry. Unknown data is labelled. Provide **Synchronize now** through the same coordinator, with truthful queued/running/success/deferred/failure outcomes. It requests one immediate cycle, not a second scheduler, configuration change or unconditional model call. See [dashboard details](dashboard-details.md).

Verify off means no automatic network traffic or dedicated panel. With opt-in, discover a task added remotely through the periodic cycle and attempt pull at every required operation boundary. Exercise network/authentication failure, active dirty work, pending push and manual trigger: local work/commits continue, effects are not repeated and retry state remains visible. Check non-fast-forward history on both divergent and fast-forwardable input, no empty up-to-date commits, no rebase/force-push, automatic simple repair and ordinary Fixer escalation for genuine ambiguity.
