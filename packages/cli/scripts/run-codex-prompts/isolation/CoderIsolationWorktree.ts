/**
 * One temporary git worktree in which a single `ptbk coder run --isolate` task is implemented.
 */
export type CoderIsolationWorktree = {
    /**
     * Name of the isolated task, for example `2026-07-0700-ptbk-coder-timing`.
     */
    readonly taskName: string;

    /**
     * Absolute path of the project the coder was started from.
     */
    readonly projectPath: string;

    /**
     * Absolute path of the temporary worktree the task is implemented in.
     */
    readonly worktreePath: string;

    /**
     * Project-relative worktree path used in human-facing messages.
     */
    readonly worktreeDisplayPath: string;

    /**
     * Name of the temporary branch checked out in the worktree.
     */
    readonly branchName: string;

    /**
     * Name of the original branch the coder runs on and the task is merged back into.
     */
    readonly baseBranchName: string;
};
