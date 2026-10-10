# Change ownership and Git persistence

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

## Non-negotiable invariants

- The coder automatically commits only proven owned changes for the relevant phase, task status and intentionally durable artifacts.
- Preserve pre-existing staged and unstaged changes, index flags and ongoing user edits. A matching path alone does not prove ownership.
- Do not use blanket `git add .`, automatic stash, destructive reset/clean, force-push or history rewriting to manufacture a successful state.
- Hooks and configured signing remain active. A hook changing captured content means an unverified tree rather than a completed task.
- Do not directly write any owned lock, journal, trace or check directory into `.git`. Standard Git commands naturally manage internal Git data; PRD 0130 is not a prohibition on using Git.
- Finalization, commit or push failures must not repeat successful implementation or duplicate an already-created local commit.

## Phase commits

Preserve the new contract for separate check commits. One task may produce multiple commits. The implementation commit contains the agent's version, and the check commit contains the checker's subsequent transformation; if both changed the same line, that boundary must remain visible on that line too. Splitting files by name alone is insufficient.

A check commit has the subject `chore: Automatically commit changes made by checks`; its body records phase, command, task, attempt and actual outcome. Even a failing check may have its own file changes and commit; that does not make validation successful. An empty delta does not produce an empty commit.

Coder normalization, status updates and finalization belong to their own scope rather than changes attributed to the checker. Support additions, deletions, renames, modes, symlinks and binary blobs; keep ignored outputs available for repair/recheck without bypassing Git ignore policy.

An intermediate commit must mark work as unfinished. A successful clean run with automatic commits must leave no eligible owned changes unpersisted at the end. A failed completion commit must not publish live `[x]`/`done`. In `--no-commit`, historical completion behavior may remain, but the result and UI must explicitly report `completed, uncommitted` and list retained paths.

The principle that a revert also restores the task applies only to specific coupled changes in history, not universally to any intermediate commit. Documentation must explain the set of task commits. Git revert does not undo external effects or itself restore an unversioned recurrence ledger.

## Dirty tree

| Mode | Required behavior |
| --- | --- |
| `fail` | Refuse uncommitted changes before new implementation; display instructions. |
| `ignore` | May proceed, but preserves someone else's baseline and does not commit it. Stop persistence on overlap/uncertainty. |
| `continue` | Require exactly one relevant interrupted task and proof of original ownership/recovery. After completing it, subsequent tasks expect a clean tree again. |

`continue` does not mean treating all dirty content as the agent's work. It cannot be combined with fresh isolation, and `fix` rejects it because it must not restore an arbitrary backlog task. Zero or multiple candidates must produce a clear error. Switching the harness during recovery is possible; author/runner history remains chronological.

Static analysis identified potential tension between current resume behavior and new ownership guards. The new engine resolves it with explicit persisted run scope rather than merely searching for `[^]`. This does not assert reproduction of a current runtime bug.

## Commit identity

Respect `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` and legacy `CODING_AGENT_GPG_KEY_ID`; Git configuration determines the signing program. Apply complete agent configuration per command. With incomplete configuration, preserve fallback to the user's Git configuration and clearly report the actual identity/signing policy. Do not promise that every commit has a dedicated agent signature.

## Related specifications

- [Git preflight](git-preflight.md)
- [Project checks and repairs](checks.md)
- [Mutation lease, journal and recovery](recovery.md)
- [Task isolation in a worktree](isolation.md)
- [Git synchronization](git-synchronization.md)
