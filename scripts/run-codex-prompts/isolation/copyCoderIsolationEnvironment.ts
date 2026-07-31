import colors from 'colors';
import { copyFile, stat } from 'fs/promises';
import { join } from 'path';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';

/**
 * Environment file which every harness script sources before calling the coding agent.
 *
 * It is intentionally kept out of version control, so a fresh worktree does not contain it and the
 * isolated task would run without the project environment unless it is copied over explicitly.
 */
const CODER_ENVIRONMENT_FILE_NAME = '.env';

/**
 * Gives the isolated worktree its own copy of the project environment.
 *
 * The copy is intentionally a snapshot: changing the environment inside the worktree never leaks
 * back into the project the coder was started from.
 */
export async function copyCoderIsolationEnvironment(worktree: CoderIsolationWorktree): Promise<void> {
    const projectEnvironmentPath = join(worktree.projectPath, CODER_ENVIRONMENT_FILE_NAME);

    if (!(await isExistingFile(projectEnvironmentPath))) {
        return;
    }

    try {
        await copyFile(projectEnvironmentPath, join(worktree.worktreePath, CODER_ENVIRONMENT_FILE_NAME));
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.warn(
            colors.yellow(
                `Could not copy \`${CODER_ENVIRONMENT_FILE_NAME}\` into the isolated worktree \`${worktree.worktreeDisplayPath}\`: ${details}`,
            ),
        );
    }
}

/**
 * Checks whether one path exists and is a file.
 */
async function isExistingFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}
