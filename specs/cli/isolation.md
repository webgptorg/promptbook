# Optional task worktree isolation

[Main specification](../_main.md)

`--isolate` executes one task in a separate Git worktree while preserving the same project identity and sequential task policy. It requires a named branch and enabled commits. Map the selected project, task source, agent definitions, context and necessary dependencies consistently.

The original branch receives result and completion only after verified integration. Preserve the task's single result commit and require fast-forward integration; a changed source branch or conflict preserves both versions and a recoverable result rather than destructive cleanup.

Keep isolation artifacts under ignored `.ptbk/` storage or another explicitly authorized ignored location. Preserve diagnostics and needed state before cleanup; never delete unintegrated work automatically. Copy only authorized local configuration, and do not present a Git worktree as a security sandbox or a separate browser/session identity.

See [workspace](workspace.md), [Git persistence](git-persistence.md) and [recovery](recovery.md).
