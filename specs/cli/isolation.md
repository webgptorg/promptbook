# Task isolation in a worktree

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

`--isolate` requires a named source branch, enabled commits and an ignored isolation directory. Create a worktree and a branch `ptbk-coder-isolation/<task-name>` with collision-safe identity. Map task sources, Books, context and nested projects into the worktree. The agent, checks and local commits run there; do not overwrite the original task source without coordination during work. The original branch receives `done` only through verified integration, rather than an early status copy.

Preserve dependency preparation and copying of the project's `.env` according to isolation policy. Do not present a Git worktree itself as a security sandbox or isolation of network/credentials. Preserve durable results/logs and required ignored outputs before cleanup, protecting original data from overwrites.

Successful integration must use `git merge --ff-only` and preserve phase history and the verified tree; automatic squash or a general merge without new checks is outside the contract. Refusal/conflict or an unexpected change to the original preserves both checkouts and precise instructions. Current policy marks merge failure as failed and continues to the next task only if further mutation is safe. Such a task does not count toward the success limit. Do not automatically remove an unintegrated worktree/branch, including on rerun; refuse an existing recoverable destination.

## Related specifications

- [Project paths and task sources](workspace.md)
- [Execution lifecycle](execution.md)
- [Change ownership and Git persistence](git-persistence.md)
- [Git synchronization](git-synchronization.md)
- [Mutation lease, journal and recovery](recovery.md)
