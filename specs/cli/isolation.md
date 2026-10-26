# Shared working tree and mutation isolation

[Main specification](../_main.md) · [Concurrent work](concurrency.md) · [Git persistence](git-persistence.md)

Tasks and chats use the selected project's **one existing working tree and current branch**. Do not create separate task worktrees or branches, switch branches for a task, or introduce per-task integration merges. The engine does not manage the user's branch choice. A project already located in a user-selected Git worktree is still supported.

Isolation means coordinated **per-file ownership**, scoped mutations, coherent checks and attributable commits under [concurrency](concurrency.md). Different files may progress concurrently; conflicting file writes wait. Preserve external user edits to affected files, unrelated index/worktree state, named-tool changes and every operation's evidence through interruption and recovery.

`--isolate` is no longer a supported task-worktree mode. Diagnose legacy use before mutation and explain shared-working-tree behavior; do not silently create a worktree or pretend the option still provides isolation. Remove it from current help/completion. Explicit nested-project Git boundaries and synchronization's visible remote merge policy remain applicable.
