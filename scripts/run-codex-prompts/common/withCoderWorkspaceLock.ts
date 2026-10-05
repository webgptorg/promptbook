import { randomBytes } from 'crypto';
import { open, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import {
    $resolveWorkspaceRepository,
    type WorkspaceRepositoryContext,
} from '../../../src/cli/cli-commands/common/workspaceRepository';
import { NotAllowed } from '../../../src/errors/NotAllowed';

/** Shared repository mutation lease, outside the working tree and therefore outside every commit scope. */
const CODER_WORKSPACE_LOCK_FILENAME = 'ptbk-coder-workspace.lock';

/**
 * Owns checks, task creation, execution and persistence as one workspace job for run, server and fix.
 * The baseline's `[^]` status excludes interrupted tasks but is not an atomic cross-process claim. This lease
 * closes the creation/claim race without rewriting any backlog status. A stale lease needs explicit recovery.
 */
export async function withCoderWorkspaceLock<T>(
    project: WorkspaceRepositoryContext | string,
    operation: () => Promise<T>,
): Promise<T> {
    const workspace = typeof project === 'string' ? await $resolveWorkspaceRepository(project) : project;
    if (!workspace.gitDirectory) {
        // Direct-script callers retain their existing Git validation; CLI mutation preflight always supplies Git.
        return operation();
    }
    const lockPath = join(workspace.gitDirectory, CODER_WORKSPACE_LOCK_FILENAME);
    const token = randomBytes(16).toString('hex');
    let handle;
    try {
        handle = await open(lockPath, 'wx');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const owner = await readFile(lockPath, 'utf-8').catch(() => '(owner unavailable)');
        throw new NotAllowed(
            spaceTrim(`
            Another Coder worker owns this workspace. No checks or tasks were started.

            Lock: \`${lockPath}\`
            Owner: ${owner.trim()}

            Stop the owning worker before retrying. If it has exited, inspect its recoverable work and remove this stale lock explicitly.
        `),
        );
    }
    try {
        await handle.writeFile(JSON.stringify({ token, processId: process.pid, projectPath: workspace.projectPath }));
        return await operation();
    } finally {
        await handle.close();
        const ownership = await readFile(lockPath, 'utf-8').catch(() => '');
        if (ownership.includes(token)) await unlink(lockPath);
    }
}
