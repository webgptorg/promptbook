import { constants } from 'fs';
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'fs/promises';
import { join, relative, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { CoderGitOperationError } from './CoderGitOperationError';
import {
    CODER_ISOLATION_WORKTREE_PATH_PATTERN,
    areCoderFileHashesEqual,
    assertCoderDeltaIsOwned,
    captureCoderRepositorySnapshot,
    captureCoderIndexTree,
    captureCoderIgnoredFileHashes,
    getCoderProtectedPaths,
    listCoderTreeDelta,
    readCoderTree,
    updateCoderIndex,
    type CoderRepositorySnapshot,
} from './coderRepositorySnapshot';
import { applyCoderRepositoryFileDelta } from './coderRepositoryFiles';

/** Private content view owned exclusively by one check, sharing the snapshot/commit service's Git objects. */
export type CoderRepositoryView = {
    readonly directory: string;
    readonly repositoryRoot: string;
    readonly projectPath: string;
    readonly isLinkedWorktree: boolean;
    readonly before: CoderRepositorySnapshot;
    readonly beforeIgnoredFileHashes: ReadonlyMap<string, string>;
};

/**
 * Copies the selected content into a private check checkout. A lease cannot exclude an unrelated editor from
 * the live checkout; running checks here makes attribution independent of that editor's writes. Ignored
 * dependencies/environment files are copied too, never hard-linked to writable user files.
 */
export async function createCoderRepositoryView(
    before: CoderRepositorySnapshot,
    projectPath: string,
    excludedPaths: ReadonlyArray<string>,
): Promise<CoderRepositoryView> {
    const gitDirectory = (await $runWorkspaceGit(before.repositoryRoot, ['rev-parse', '--absolute-git-dir'])).trim();
    const viewsDirectory = join(gitDirectory, 'ptbk-coder', 'check-views');
    await mkdir(viewsDirectory, { recursive: true });
    const directory = await mkdtemp(join(viewsDirectory, 'check-'));
    const repositoryRoot = join(directory, 'tree');
    try {
        const beforeIgnoredFileHashes = await captureCoderIgnoredFileHashes(before.repositoryRoot, excludedPaths);
        if (before.head) {
            await $runWorkspaceGit(before.repositoryRoot, [
                'worktree',
                'add',
                '--detach',
                '--no-checkout',
                repositoryRoot,
                before.head,
            ]);
        } else {
            // Git cannot detach an unborn HEAD. A shared, empty clone keeps its private index/HEAD separate and
            // uses the same object store for staged blobs, without creating any automatic commit.
            await $runWorkspaceGit(before.repositoryRoot, [
                'clone',
                '--shared',
                '--no-checkout',
                '--',
                before.repositoryRoot,
                repositoryRoot,
            ]);
        }
        const excludedAbsolutePaths = new Set(excludedPaths.map((path) => resolve(before.repositoryRoot, path)));
        // Copy children separately: Node refuses copying a directory into its own metadata directory even
        // when the recursive filter excludes `.git`. The view's newly created `.git` must remain intact.
        for (const name of await readdir(before.repositoryRoot)) {
            if (name === '.git') continue;
            await cp(join(before.repositoryRoot, name), join(repositoryRoot, name), {
                recursive: true,
                verbatimSymlinks: true,
                mode: constants.COPYFILE_FICLONE,
                filter: (source) => {
                    if (excludedAbsolutePaths.has(source)) return false;
                    // Recoverable Coder execution worktrees are separate repositories, not project dependencies.
                    return !CODER_ISOLATION_WORKTREE_PATH_PATTERN.test(
                        relative(before.repositoryRoot, source).replace(/\\/gu, '/'),
                    );
                },
            });
        }
        const originalIndexPath = resolve(
            before.repositoryRoot,
            (await $runWorkspaceGit(before.repositoryRoot, ['rev-parse', '--git-path', 'index'])).trim(),
        );
        const viewIndexPath = resolve(
            repositoryRoot,
            (await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--git-path', 'index'])).trim(),
        );
        try {
            await cp(originalIndexPath, viewIndexPath, { mode: constants.COPYFILE_FICLONE });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            await $runWorkspaceGit(repositoryRoot, ['read-tree', '--empty']);
            await updateCoderIndex(repositoryRoot, before.indexEntries, [...before.indexEntries.keys()]);
        }
        const viewBefore = await captureCoderRepositorySnapshot(repositoryRoot, excludedPaths);
        if (
            viewBefore.head !== before.head ||
            viewBefore.indexFingerprint !== before.indexFingerprint ||
            !areCoderFileHashesEqual(viewBefore.workingFileHashes, before.workingFileHashes)
        ) {
            throw new CoderGitOperationError(
                'record',
                'Content changed while preparing the private check checkout. No check was started.',
            );
        }
        if (
            !areCoderFileHashesEqual(
                beforeIgnoredFileHashes,
                await captureCoderIgnoredFileHashes(repositoryRoot, excludedPaths),
            )
        ) {
            throw new CoderGitOperationError(
                'record',
                'Ignored dependencies/artifacts changed while preparing the private check checkout. No check was started.',
            );
        }
        await writeFile(
            join(directory, 'view.json'),
            JSON.stringify(
                {
                    repositoryRoot: before.repositoryRoot,
                    projectPath,
                    head: before.head,
                    tree: before.tree,
                    executionRoot: repositoryRoot,
                    state: 'checking',
                },
                null,
                2,
            ),
        );
        return {
            directory,
            repositoryRoot,
            projectPath: join(repositoryRoot, relative(before.repositoryRoot, projectPath)),
            isLinkedWorktree: Boolean(before.head),
            beforeIgnoredFileHashes,
            before: viewBefore,
        };
    } catch (error) {
        throw new CoderGitOperationError(
            'record',
            spaceTrim(`
            Could not prepare the private check checkout. Partial work was retained in \`${directory}\`.
            ${error instanceof Error ? error.message : String(error)}
        `),
        );
    }
}

/**
 * Imports only the private command's content/mode delta after checking the live boundary and original user
 * ownership. The real staging area is left intact; the shared commit service persists the phase's exact tree.
 */
export async function applyCoderRepositoryView(
    view: CoderRepositoryView,
    after: CoderRepositorySnapshot,
    operation: CoderRepositorySnapshot,
    retained: CoderRepositorySnapshot,
    excludedPaths: ReadonlyArray<string>,
    afterIgnoredFileHashes: ReadonlyMap<string, string>,
): Promise<void> {
    const beforeFiles = withIgnoredViewEntries(view.before, view.beforeIgnoredFileHashes);
    const afterFiles = withIgnoredViewEntries(after, afterIgnoredFileHashes);
    const paths = listCoderTreeDelta(beforeFiles.entries, afterFiles.entries);
    const headEntries = operation.head ? await readCoderTree(operation.repositoryRoot, operation.head) : new Map();
    assertCoderDeltaIsOwned(operation, paths, headEntries);
    const protectedPaths = getCoderProtectedPaths(operation, headEntries);
    if (
        listCoderTreeDelta(view.before.indexEntries, after.indexEntries).some((path) => protectedPaths.has(path)) ||
        [...protectedPaths].some((path) => view.before.indexFlags.get(path) !== after.indexFlags.get(path))
    ) {
        throw new CoderGitOperationError(
            'record',
            'The check changed pre-existing user staging entries in its private view. The live index and user files were left untouched.',
        );
    }
    if (after.head !== view.before.head) {
        throw new CoderGitOperationError(
            'record',
            'The check changed Git history in its private view. Its work was retained; Coder will not guess or integrate those commits.',
        );
    }
    // Also detect a writer targeting the live checkout (e.g. through an absolute path in a check). Such edits
    // never become part of the command delta, even if they occurred while the owned command was running.
    await assertLiveCheckBoundary(retained, excludedPaths, view.beforeIgnoredFileHashes);
    const quiescent = await captureCoderRepositorySnapshot(view.repositoryRoot, excludedPaths);
    if (
        quiescent.head !== after.head ||
        quiescent.indexFingerprint !== after.indexFingerprint ||
        !areCoderFileHashesEqual(quiescent.workingFileHashes, after.workingFileHashes) ||
        !areCoderFileHashesEqual(
            afterIgnoredFileHashes,
            await captureCoderIgnoredFileHashes(view.repositoryRoot, excludedPaths),
        )
    ) {
        throw new CoderGitOperationError(
            'record',
            'A private check writer is still active after command completion. Its files were retained instead of importing an unstable result.',
        );
    }
    await applyCoderRepositoryFileDelta(view.repositoryRoot, retained.repositoryRoot, afterFiles.entries, paths);
    const current = await captureCoderRepositorySnapshot(retained.repositoryRoot, excludedPaths);
    const currentFiles = withIgnoredViewEntries(
        current,
        await captureCoderIgnoredFileHashes(retained.repositoryRoot, excludedPaths),
    );
    if (
        current.head !== retained.head ||
        current.indexFingerprint !== retained.indexFingerprint ||
        !areCoderFileHashesEqual(afterFiles.workingFileHashes, currentFiles.workingFileHashes)
    ) {
        throw new CoderGitOperationError(
            'record',
            'Concurrent edits appeared while importing check changes. Both check and live content were retained; no phase was committed.',
        );
    }
}

/**
 * Linked check views already share objects. An unborn branch uses a shared clone whose newly written objects
 * must be transferred before recovery refs or phase commits can reference them in the execution repository.
 */
export async function retainCoderRepositoryViewSnapshot(
    view: CoderRepositoryView,
    snapshot: CoderRepositorySnapshot,
    repositoryRoot: string,
): Promise<void> {
    if (view.isLinkedWorktree) return;
    const indexTree = await captureCoderIndexTree(snapshot);
    await $runWorkspaceGit(repositoryRoot, [
        'fetch',
        '--no-tags',
        '--no-write-fetch-head',
        '--no-auto-maintenance',
        '--',
        view.repositoryRoot,
        snapshot.tree,
        ...(indexTree === snapshot.tree ? [] : [indexTree]),
    ]);
}

/** Detects unrelated live edits while the check has exclusive ownership of its private copy. */
export async function assertLiveCheckBoundary(
    before: CoderRepositorySnapshot,
    excludedPaths: ReadonlyArray<string>,
    ignoredFileHashes?: ReadonlyMap<string, string>,
): Promise<void> {
    const current = await captureCoderRepositorySnapshot(before.repositoryRoot, excludedPaths);
    if (
        current.head !== before.head ||
        current.indexFingerprint !== before.indexFingerprint ||
        !areCoderFileHashesEqual(current.workingFileHashes, before.workingFileHashes) ||
        (ignoredFileHashes &&
            !areCoderFileHashesEqual(
                ignoredFileHashes,
                await captureCoderIgnoredFileHashes(before.repositoryRoot, excludedPaths),
            ))
    ) {
        throw new CoderGitOperationError(
            'record',
            'Unexpected concurrent edits in the live checkout during checks. User content was retained and the private check result was not committed or imported.',
        );
    }
}

/** Combines retention-only ignored files with eligible files solely for a private view's safe content import. */
function withIgnoredViewEntries(
    snapshot: CoderRepositorySnapshot,
    ignoredFileHashes: ReadonlyMap<string, string>,
): CoderRepositorySnapshot {
    const entries = new Map(snapshot.entries);
    for (const [path, hash] of ignoredFileHashes) {
        const [mode, objectId] = hash.split(':');
        entries.set(path, { mode: mode!, objectId: objectId! });
    }
    return { ...snapshot, entries, workingFileHashes: new Map([...snapshot.workingFileHashes, ...ignoredFileHashes]) };
}

/** Removes only an imported disposable copy; failed/ambiguous/interrupted views are kept for recovery. */
export async function removeCoderRepositoryView(view: CoderRepositoryView, originalRoot: string): Promise<void> {
    if (view.isLinkedWorktree) {
        // This copy's dirty changes have already been imported and retained as immutable recovery trees. The
        // scoped removal is safe for this private disposable view, never for a user/execution checkout.
        await $runWorkspaceGit(originalRoot, ['worktree', 'remove', '--force', '--', view.repositoryRoot]);
    }
    await rm(view.directory, { recursive: true });
}
