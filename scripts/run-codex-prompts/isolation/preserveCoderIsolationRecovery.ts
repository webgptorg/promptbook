import { cp, mkdir } from 'fs/promises';
import { basename, join } from 'path';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';

/** Keeps durable phase/persistence records before Git removes an integrated worktree's private Git directory. */
export async function preserveCoderIsolationRecovery(worktree: CoderIsolationWorktree): Promise<void> {
    const executionGitDirectory = (
        await $runWorkspaceGit(worktree.worktreePath, ['rev-parse', '--absolute-git-dir'])
    ).trim();
    const originalGitDirectory = (
        await $runWorkspaceGit(worktree.projectPath, ['rev-parse', '--absolute-git-dir'])
    ).trim();
    const destination = join(originalGitDirectory, 'ptbk-coder', 'isolated', basename(executionGitDirectory));
    try {
        await mkdir(join(originalGitDirectory, 'ptbk-coder', 'isolated'), { recursive: true });
        await cp(join(executionGitDirectory, 'ptbk-coder'), destination, {
            recursive: true,
            errorOnExist: true,
            force: false,
        });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw new CoderGitOperationError(
            'record',
            `Could not preserve isolated recovery records in \`${destination}\`. The worktree was retained: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}
