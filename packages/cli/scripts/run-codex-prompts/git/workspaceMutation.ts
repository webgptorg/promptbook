import { AsyncLocalStorage } from 'async_hooks';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { hostname } from 'os';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { spaceTrim } from 'spacetrim';
import type { WorkspaceRepositoryContext } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { ConflictError } from '../../../src/errors/ConflictError';

/** Shell-free Git invocation shared by workspace persistence and synchronization. */
const EXECUTE_FILE = promisify(execFile);
/** Reentrant ownership is limited to the current asynchronous operation, never a process-global selection. */
const MUTATION_CONTEXT = new AsyncLocalStorage<string>();

/**
 * Runs Git with an explicit root and without interactive credential prompts or optional index refreshes.
 */
export async function executeWorkspaceGit(
    repositoryRoot: string,
    argumentsList: ReadonlyArray<string>,
    environment: Partial<NodeJS.ProcessEnv> = process.env,
): Promise<string> {
    const { stdout } = await EXECUTE_FILE('git', [...argumentsList], {
        cwd: repositoryRoot,
        env: {
            ...process.env,
            ...environment,
            GIT_TERMINAL_PROMPT: '0',
            GIT_OPTIONAL_LOCKS: '0',
            GIT_SSH_COMMAND: environment.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes',
            LC_ALL: 'C',
        },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 60_000,
        windowsHide: true,
    });
    return stdout.trimEnd();
}

/**
 * Acquires a filesystem lease. A live owner is never removed. Dead owners are atomically quarantined for recovery.
 * A malformed or foreign-host lease needs manual inspection; elapsed time alone never proves ownership expired.
 */
export async function acquireWorkspaceLease(lockPath: string): Promise<() => Promise<void>> {
    const token = randomUUID();
    await mkdir(resolve(lockPath, '..'), { recursive: true });
    try {
        await mkdir(lockPath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const owner = await readFile(join(lockPath, 'owner.json'), 'utf-8')
            .then((content) => JSON.parse(content) as { pid: number; hostname: string; token: string })
            .catch(() => null);
        let isOwnerAlive = true;
        if (owner?.hostname === hostname() && Number.isSafeInteger(owner.pid) && owner.pid > 0) {
            try {
                process.kill(owner.pid, 0);
            } catch (failure) {
                isOwnerAlive = (failure as NodeJS.ErrnoException).code !== 'ESRCH';
            }
        }
        if (isOwnerAlive) {
            throw new ConflictError(
                spaceTrim(`
                Workspace is owned by ${
                    owner ? `process \`${owner.pid}\` on \`${owner.hostname}\`` : 'an unverified process'
                }.
                Lock: \`${lockPath}\`.
                Stop its command gracefully and retry. Inspect an unverified lock before recovering it; do not remove a live owner's lock.
            `),
            );
        }
        // Rename first: two recovery attempts cannot both delete and replace the original ownership directory.
        const recoveredPath = `${lockPath}.recovered-${token}`;
        await rename(lockPath, recoveredPath);
        await rm(recoveredPath, { recursive: true });
        await mkdir(lockPath);
    }
    await writeFile(join(lockPath, 'owner.json'), JSON.stringify({ pid: process.pid, hostname: hostname(), token }), {
        flag: 'wx',
        mode: 0o600,
    });
    return async () => {
        const owner = JSON.parse(await readFile(join(lockPath, 'owner.json'), 'utf-8')) as { token: string };
        if (owner.token === token) await rm(lockPath, { recursive: true });
    };
}

/**
 * Serializes repository writers across CLI commands, server workers and Next UI mutations, including linked worktrees.
 * Contention is visible instead of silently waiting forever. Callers can defer and retry before making changes.
 */
export async function withWorkspaceMutation<Result>(
    workspace: WorkspaceRepositoryContext,
    operation: () => Promise<Result>,
): Promise<Result> {
    const repositoryRoot = workspace.repositoryRoot!;
    const commonDirectory = await executeWorkspaceGit(repositoryRoot, ['rev-parse', '--git-common-dir']);
    const lockPath = join(resolve(repositoryRoot, commonDirectory), 'ptbk-coder-mutation.lock');
    if (MUTATION_CONTEXT.getStore() === lockPath) return operation();
    const release = await acquireWorkspaceLease(lockPath);
    try {
        return await MUTATION_CONTEXT.run(lockPath, operation);
    } finally {
        await release();
    }
}

// Note: [🟡] Shared workspace mutation services are only published in `@promptbook/cli`.
// Note: [💞] Ignore a discrepancy between file name and exported helper names
