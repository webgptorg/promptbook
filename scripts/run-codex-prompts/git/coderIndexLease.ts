import { lstat, open, readFile, rename, unlink, writeFile, type FileHandle } from 'fs/promises';
import { resolve } from 'path';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { CoderGitOperationError } from './CoderGitOperationError';
import { updateCoderIndex, withCoderSnapshotIndex, type CoderTreeEntry } from './coderRepositorySnapshot';

/** Git's real index lease, independent of the private index used by normal commit hooks/signing. */
export type CoderIndexLease = {
    /** Publishes exact owned entries while retaining every other staging entry and its flags. */
    publish(entries: ReadonlyMap<string, CoderTreeEntry>, paths: ReadonlyArray<string>): Promise<void>;
};

/**
 * Holds Git's standard index.lock across capture, hooks, signing and publication. A post-hoc comparison
 * followed by update-index has a race: another git add could be overwritten between those two operations.
 */
export async function withCoderIndexLease<T>(
    repositoryRoot: string,
    operation: (lease: CoderIndexLease) => Promise<T>,
): Promise<T> {
    const indexPath = resolve(
        repositoryRoot,
        (await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--git-path', 'index'])).trim(),
    );
    const lockPath = `${indexPath}.lock`;
    let handle: FileHandle;
    try {
        handle = await open(lockPath, 'wx');
    } catch (error) {
        throw new CoderGitOperationError(
            'record',
            `Could not acquire Git index ownership at \`${lockPath}\`. Another Git writer or an interrupted Git operation may own it. Inspect that operation before retrying; no index was replaced.\n${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
    const ownership = await handle.stat();
    let isClosed = false;
    try {
        const originalBytes = await readOptionalIndex(indexPath);
        return await operation({
            publish: async (entries, paths) => {
                await withCoderSnapshotIndex(repositoryRoot, async (privateIndexPath) => {
                    if (originalBytes) await writeFile(privateIndexPath, originalBytes);
                    else
                        await $runWorkspaceGit(repositoryRoot, ['read-tree', '--empty'], {
                            env: { GIT_INDEX_FILE: privateIndexPath },
                        });
                    await updateCoderIndex(repositoryRoot, entries, paths, { GIT_INDEX_FILE: privateIndexPath });
                    const currentBytes = await readOptionalIndex(indexPath);
                    if (
                        Boolean(originalBytes) !== Boolean(currentBytes) ||
                        (originalBytes && !originalBytes.equals(currentBytes!))
                    ) {
                        throw new CoderGitOperationError(
                            'record',
                            'The real index changed despite the Git index lease. User staging and existing commits were retained; the private phase index was not published.',
                        );
                    }
                    await handle.writeFile(await readFile(privateIndexPath));
                    await handle.close();
                    isClosed = true;
                    await rename(lockPath, indexPath);
                });
            },
        });
    } finally {
        if (!isClosed) await handle.close();
        const remaining = await lstat(lockPath).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return undefined;
            throw error;
        });
        // Publishing moved our inode to index. Never remove a later user's new index.lock.
        if (remaining?.ino === ownership.ino && remaining.dev === ownership.dev) await unlink(lockPath);
    }
}

/** An unborn branch legitimately has no index; arbitrary read errors must not become an empty index. */
async function readOptionalIndex(path: string): Promise<Buffer | undefined> {
    try {
        return await readFile(path);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
    }
}
