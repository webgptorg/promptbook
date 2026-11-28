import { chmod, lstat, mkdir, readFile, readlink, rm, rmdir, symlink, writeFile } from 'fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'path';
import { CoderGitOperationError } from './CoderGitOperationError';
import { CODER_FILE_PERMISSIONS_MASK, type CoderTreeEntry } from './coderRepositorySnapshot';

/**
 * Imports an already attributed raw leaf delta into a checkout. Callers validate source quiescence and
 * destination ownership before calling, then verify retained bytes afterward using the shared snapshot service.
 */
export async function applyCoderRepositoryFileDelta(
    sourceRoot: string,
    repositoryRoot: string,
    entries: ReadonlyMap<string, CoderTreeEntry>,
    paths: ReadonlyArray<string>,
): Promise<void> {
    for (const path of paths) {
        const destination = relative(repositoryRoot, resolve(repositoryRoot, path));
        if (isAbsolute(destination) || destination === '..' || destination.startsWith('../'))
            throw new CoderGitOperationError('record', `Unsafe retained result path \`${path}\`.`);
        if (entries.get(path)?.mode === '160000')
            throw new CoderGitOperationError(
                'record',
                `Changes to submodule \`${path}\` require manual integration; the execution copy was retained.`,
            );
        await assertSafeFileParent(repositoryRoot, path);
        await assertSafeFileParent(sourceRoot, path);
    }
    // Remove deeper leaves first. Empty directories may be replaced, but unrelated children are never removed.
    for (const path of [...paths].sort((left, right) => right.split('/').length - left.split('/').length))
        await removeFileDestination(repositoryRoot, path);
    for (const path of paths) {
        const entry = entries.get(path);
        if (!entry) continue;
        const destination = resolve(repositoryRoot, path);
        const source = resolve(sourceRoot, path);
        await mkdir(dirname(destination), { recursive: true });
        if (entry.mode === '120000') await symlink(await readlink(source), destination);
        else {
            await writeFile(destination, await readFile(source));
            await chmod(destination, (await lstat(source)).mode & CODER_FILE_PERMISSIONS_MASK);
        }
    }
}

/** Refuses to follow a directory symlink while importing leaves into a checkout. */
async function assertSafeFileParent(repositoryRoot: string, path: string): Promise<void> {
    let ancestor = repositoryRoot;
    for (const segment of path.split('/').slice(0, -1)) {
        ancestor = join(ancestor, segment);
        try {
            if ((await lstat(ancestor)).isSymbolicLink())
                throw new CoderGitOperationError(
                    'record',
                    `Cannot safely import \`${path}\` through directory symlink \`${ancestor}\`. Both versions were retained.`,
                );
        } catch (error) {
            if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) return;
            throw error;
        }
    }
}

/** Removes only one leaf or an empty directory, preserving unrelated files below directory replacements. */
async function removeFileDestination(repositoryRoot: string, path: string): Promise<void> {
    const destination = resolve(repositoryRoot, path);
    try {
        if ((await lstat(destination)).isDirectory()) await rmdir(destination);
        else await rm(destination);
    } catch (error) {
        if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
    }
}
