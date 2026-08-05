import colors from 'colors';
import type { CoderCommitScope } from './coderCommitScope';
import { captureCoderCommitScope, resolveCoderCommitScopePaths } from './coderCommitScope';
import { commitChanges } from './commitChanges';
import { pullLatestChanges } from './pullLatestChanges';

/**
 * Automatic git synchronization of the project changes made by one `ptbk coder` command.
 *
 * Note: This is the single place where pulling, committing and pushing of `ptbk coder` project changes is
 *       implemented, every command which offers `--commit`, `--auto-push` and `--auto-pull` reuses it.
 */
export type CoderGitSyncOptions = {
    /**
     * Commit the changes made by the command.
     */
    readonly isCommitEnabled: boolean;

    /**
     * Push the created commit to the remote repository.
     */
    readonly isAutoPushEnabled: boolean;

    /**
     * Pull the latest changes from the remote repository before the command changes anything.
     */
    readonly isAutoPullEnabled: boolean;
};

/**
 * Git synchronization which leaves the repository completely untouched.
 *
 * Note: This is the default for every command and helper which supports the git synchronization.
 */
export const DISABLED_CODER_GIT_SYNC_OPTIONS: CoderGitSyncOptions = Object.freeze({
    isCommitEnabled: false,
    isAutoPushEnabled: false,
    isAutoPullEnabled: false,
});

/**
 * Pulls the latest repository changes and captures the working tree state before a `ptbk coder` command
 * changes the project.
 *
 * The returned scope is handed over to `$commitCoderChanges` of the very same command, which then commits
 * exactly the files this command has changed.
 */
export async function $startCoderGitSync(options: {
    readonly gitSync: CoderGitSyncOptions;
    readonly projectPath?: string;
}): Promise<CoderCommitScope> {
    const { gitSync, projectPath = process.cwd() } = options;

    await $pullCoderChanges({ gitSync, projectPath });

    if (!gitSync.isCommitEnabled) {
        // Note: A command which does not commit must not touch git at all, so that it also works in a project
        //       which is not a git repository
        return { projectPath, snapshotBeforeOperation: { changedFileHashes: new Map() } };
    }

    // Note: The scope is captured after pulling, so files brought in by the pull are not committed again
    return captureCoderCommitScope(projectPath);
}

/**
 * Pulls the latest repository changes before a `ptbk coder` command changes the project.
 */
export async function $pullCoderChanges(options: {
    readonly gitSync: CoderGitSyncOptions;
    readonly projectPath?: string;
}): Promise<void> {
    const { gitSync, projectPath = process.cwd() } = options;

    if (!gitSync.isAutoPullEnabled) {
        return;
    }

    console.info(colors.gray('Pulling the latest changes from the remote repository...'));
    await pullLatestChanges(projectPath);
}

/**
 * Commits - and when requested also pushes - the changes one `ptbk coder` command has just made.
 *
 * Note: Only the files this very command has changed are committed, everything else is left in the working tree.
 * Note: A command which changed nothing is left alone instead of creating an empty commit.
 */
export async function $commitCoderChanges(options: {
    readonly gitSync: CoderGitSyncOptions;
    readonly commitMessage: string;
    readonly commitScope: CoderCommitScope;
}): Promise<void> {
    const { gitSync, commitMessage, commitScope } = options;

    if (!gitSync.isCommitEnabled) {
        return;
    }

    const relevantPaths = await resolveCoderCommitScopePaths(commitScope);
    if (relevantPaths.length === 0) {
        console.info(colors.gray('Nothing to commit, this command has not changed any file'));
        return;
    }

    await commitChanges(commitMessage, {
        projectPath: commitScope.projectPath,
        relevantPaths,
        autoPush: gitSync.isAutoPushEnabled,
    });

    console.info(
        colors.green(`✓ ${gitSync.isAutoPushEnabled ? 'Committed and pushed' : 'Committed'}: ${commitMessage}`),
    );
}
