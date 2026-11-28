import { lstat, mkdir, writeFile } from 'fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'path';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { CoderGitOperationError } from './CoderGitOperationError';
import {
    isCoderGitPathIgnored,
    updateCoderIndex,
    withCoderSnapshotIndex,
    type CoderRepositorySnapshot,
} from './coderRepositorySnapshot';

/** A Coder status/trace candidate which is persisted before it becomes visible to queue readers. */
export type CoderFinalizationFile = { readonly path: string; readonly content: Buffer };

/** Builds a candidate tree through the shared private-index service without rewriting the live task status. */
export async function buildCoderFinalizationSnapshot(
    retained: CoderRepositorySnapshot,
    files: ReadonlyArray<CoderFinalizationFile>,
): Promise<CoderRepositorySnapshot> {
    const entries = new Map(retained.entries);
    const workingFileHashes = new Map(retained.workingFileHashes);
    const paths: string[] = [];
    for (const file of files) {
        const path = finalizationGitPath(retained.repositoryRoot, file.path);
        if (
            !entries.has(path) &&
            !retained.indexEntries.has(path) &&
            (await isCoderGitPathIgnored(retained.repositoryRoot, path))
        )
            continue;
        const mode = entries.get(path)?.mode ?? '100644';
        if (!['100644', '100755'].includes(mode))
            throw new CoderGitOperationError(
                'record',
                `Coder finalization cannot overwrite non-regular file \`${path}\`.`,
            );
        const objectId = (
            await $runWorkspaceGit(retained.repositoryRoot, ['hash-object', '-w', '--no-filters', '--stdin'], {
                input: file.content,
            })
        ).trim();
        entries.set(path, { mode, objectId });
        workingFileHashes.set(path, `${mode}:${objectId}`);
        paths.push(path);
    }
    const tree = await withCoderSnapshotIndex(retained.repositoryRoot, async (indexPath) => {
        const env = { GIT_INDEX_FILE: indexPath };
        await $runWorkspaceGit(retained.repositoryRoot, ['read-tree', retained.tree], { env });
        await updateCoderIndex(retained.repositoryRoot, entries, paths, env);
        return (await $runWorkspaceGit(retained.repositoryRoot, ['write-tree'], { env })).trim();
    });
    return { ...retained, tree, entries, workingFileHashes };
}

/** Publishes already persisted candidates in caller order, with the selected task status last. */
export async function publishCoderFinalizationFiles(
    retained: CoderRepositorySnapshot,
    files: ReadonlyArray<CoderFinalizationFile>,
): Promise<void> {
    for (const file of files) {
        const path = finalizationGitPath(retained.repositoryRoot, file.path);
        const absolutePath = resolve(retained.repositoryRoot, path);
        await assertCoderRegularWriterPath(retained.repositoryRoot, absolutePath);
        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, file.content);
    }
}

/** Refuses known status/script/log writers before they can follow a user symlink or replace a special file. */
export async function assertCoderRegularWriterPath(repositoryRoot: string, absolutePath: string): Promise<void> {
    const path = finalizationGitPath(repositoryRoot, absolutePath);
    let ancestor = repositoryRoot;
    for (const segment of path.split('/')) {
        ancestor = resolve(ancestor, segment);
        try {
            const details = await lstat(ancestor);
            if (details.isSymbolicLink() || (ancestor === absolutePath && !details.isFile())) {
                throw new CoderGitOperationError(
                    'record',
                    `Cannot write Coder bookkeeping through non-regular path \`${ancestor}\`. User content was retained.`,
                );
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
            throw error;
        }
    }
}

/** Keeps candidate paths inside the explicit Git root, including nested selected projects. */
function finalizationGitPath(repositoryRoot: string, path: string): string {
    const gitPath = relative(repositoryRoot, resolve(repositoryRoot, path)).replace(/\\/gu, '/');
    if (isAbsolute(gitPath) || gitPath === '..' || gitPath.startsWith('../') || !gitPath) {
        throw new CoderGitOperationError(
            'record',
            `Finalization path \`${path}\` is outside the execution repository.`,
        );
    }
    return gitPath;
}
