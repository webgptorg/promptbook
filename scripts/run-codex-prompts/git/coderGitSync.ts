import colors from 'colors';
import { commitChanges } from './commitChanges';
import { pullLatestChanges } from './pullLatestChanges';
import { runGitCommand } from './runGitCommand';

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
 * Note: A repository without any change is left alone instead of creating an empty commit.
 */
export async function $commitCoderChanges(options: {
    readonly gitSync: CoderGitSyncOptions;
    readonly commitMessage: string;
    readonly projectPath?: string;
}): Promise<void> {
    const { gitSync, commitMessage, projectPath = process.cwd() } = options;

    if (!gitSync.isCommitEnabled) {
        return;
    }

    if (!(await hasChangesToCommit(projectPath))) {
        console.info(colors.gray('Nothing to commit, the working tree is clean'));
        return;
    }

    await commitChanges(commitMessage, {
        projectPath,
        autoPush: gitSync.isAutoPushEnabled,
    });

    console.info(
        colors.green(`✓ ${gitSync.isAutoPushEnabled ? 'Committed and pushed' : 'Committed'}: ${commitMessage}`),
    );
}

/**
 * Checks whether the repository holds any change which can be committed.
 */
async function hasChangesToCommit(projectPath: string): Promise<boolean> {
    const gitStatus = await runGitCommand({
        command: 'git status --porcelain',
        cwd: projectPath,
        isVerbose: false,
    });

    return gitStatus.trim() !== '';
}
