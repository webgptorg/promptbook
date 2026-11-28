# Additional direct Git metadata writes in Coder persistence

While tracing `ptbk coder run` for the workspace-lock relocation, I found separate persistence behavior that
also writes directly into Git metadata. The workspace lock now uses `.promptbook/ptbk-coder`; these existing
persistence operations need a separate change to satisfy a broader prohibition on direct `.git` writes.

-   [`coderIndexLease.ts`](../scripts/run-codex-prompts/git/coderIndexLease.ts) directly creates Git's real
    `index.lock`, writes its replacement index, renames it over the real index and removes the owned lock.
    This currently protects user staging across hooks and signing. Simply moving this standard Git lock
    would remove protection against concurrent `git add` processes, so replacing it requires analysis of
    the complete persistence protocol.
-   [`runGitCommand.ts`](../scripts/run-codex-prompts/git/runGitCommand.ts) automatically removes a Git
    `index.lock` once its modification time is at least two minutes old. **Age does not prove that its owner
    has exited**; a long-running Git operation can still own that file. A separate fix should retain the lock
    and provide manual recovery guidance instead of deleting another process's lock.
-   [`coderRepositorySnapshot.ts`](../scripts/run-codex-prompts/git/coderRepositorySnapshot.ts),
    [`coderRepositoryView.ts`](../scripts/run-codex-prompts/git/coderRepositoryView.ts),
    [`CoderPhaseRecovery.ts`](../scripts/run-codex-prompts/git/CoderPhaseRecovery.ts),
    [`commitChanges.ts`](../scripts/run-codex-prompts/git/commitChanges.ts) and
    [`preserveCoderIsolationRecovery.ts`](../scripts/run-codex-prompts/isolation/preserveCoderIsolationRecovery.ts)
    store private indexes, check copies and recovery files under the resolved Git directory's `ptbk-coder`.
    Relocating these files also requires keeping them out of snapshots and check-copy traversal and preserving
    recovery data when an isolated worktree is removed.

These operations are separate from the Coder workspace lock and were left unchanged to keep this task scoped
to its requested lock relocation. Git commands used for normal commits and worktree management also write
Git metadata through Git itself.
