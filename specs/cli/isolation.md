# Optional task worktree isolation

[Main specification](../_main.md)

`--isolate` executes one task in a separate Git worktree while preserving project identity and sequential task policy. It requires a named branch and enabled commits. Map project, sources, agents, context and necessary dependencies consistently. A worktree is not another engine, browser-session identity or security sandbox.

The source project's live tool registry remains authoritative: tool additions/changes from other clients are not lost merely because task files live in a worktree. Preserve current-use rules and keep tool-management commits separate from the task result. Do not copy stale configuration back over intervening project changes at integration.

Create one verified task result commit in the task context, then integrate into the project branch with a visible **non-fast-forward merge**, preserving the original result and all intervening commits. The integration commit is not a second task result or execution. A changed source branch is reconciled, not rewritten by rebase, amend or force reset. Conflicts preserve both versions and use the ordinary [Fixer path](../concepts/automatic-repair.md); never delete unintegrated work automatically.

The project branch receives accepted result/completion only through successful verified integration. Publish that integrated branch under [synchronization](git-synchronization.md), not the temporary branch. Keep isolation artifacts in ignored `.ptbk/` or another explicitly authorized ignored location, preserving diagnostics and recovery state before cleanup. Copy/access only authorized local configuration and never commit secrets while preparing the worktree.

See [workspace](workspace.md), [Git persistence](git-persistence.md) and [recovery](recovery.md).
