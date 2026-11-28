import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import type { CoderCommitScope } from '../git/coderCommitScope';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { applyCoderRepositoryFileDelta } from '../git/coderRepositoryFiles';
import {
    areCoderFileHashesEqual,
    captureCoderIgnoredFileHashes,
    readCoderWorkingFileHashes,
    type CoderTreeEntry,
} from '../git/coderRepositorySnapshot';

/** Ignored execution output is retained without making it eligible for an automatic commit. */
export type CoderIsolationIgnoredBoundary = {
    readonly repositoryRoot: string;
    readonly objectFormat: string;
    readonly original: ReadonlyMap<string, string>;
    readonly executionBefore?: ReadonlyMap<string, string>;
    readonly excludedPaths: ReadonlyArray<string>;
};

/** Captures the original ignored result before creating a worktree or running any owned writer. */
export async function captureCoderIsolationIgnoredFiles(
    scope: CoderCommitScope,
    excludedPaths: ReadonlyArray<string>,
): Promise<CoderIsolationIgnoredBoundary | undefined> {
    if (!scope.repositorySnapshot) return undefined;
    const repositoryRoot = scope.repositorySnapshot.repositoryRoot;
    return {
        repositoryRoot,
        excludedPaths,
        objectFormat: (await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--show-object-format'])).trim(),
        original: await captureCoderIgnoredFileHashes(repositoryRoot, excludedPaths),
    };
}

/** Establishes the actual execution baseline; original-only ignored files are never inferred as deletions. */
export async function beginCoderIsolationIgnoredFiles(
    boundary: CoderIsolationIgnoredBoundary | undefined,
    executionRoot: string,
): Promise<CoderIsolationIgnoredBoundary | undefined> {
    if (!boundary) return undefined;
    return {
        ...boundary,
        executionBefore: await captureCoderIgnoredFileHashes(executionRoot, boundary.excludedPaths),
    };
}

/**
 * Retains only proven execution changes to ignored output before worktree removal. The existing isolation
 * environment policy and known artifact retention stay separate, and concurrent original edits stop cleanup.
 */
export async function preserveCoderIsolationIgnoredFiles(
    boundary: CoderIsolationIgnoredBoundary | undefined,
    executionRoot: string,
): Promise<void> {
    if (!boundary?.executionBefore) return;
    const executionAfter = await captureCoderIgnoredFileHashes(executionRoot, boundary.excludedPaths);
    const paths = [...new Set([...boundary.executionBefore.keys(), ...executionAfter.keys()])].filter(
        (path) => boundary.executionBefore!.get(path) !== executionAfter.get(path),
    );
    if (!paths.length) return;
    const current = await readCoderWorkingFileHashes(boundary.repositoryRoot, paths, boundary.objectFormat);
    const pendingPaths = paths.filter((path) => current.get(path) !== executionAfter.get(path));
    for (const path of pendingPaths) {
        if (current.get(path) !== boundary.original.get(path))
            throw new CoderGitOperationError(
                'record',
                `Ignored output \`${path}\` changed in the original checkout during isolated execution. Both copies were retained; the execution worktree will not be removed.`,
            );
    }
    const quiescent = await captureCoderIgnoredFileHashes(executionRoot, boundary.excludedPaths);
    if (!areCoderFileHashesEqual(executionAfter, quiescent))
        throw new CoderGitOperationError(
            'record',
            'Ignored execution output is still changing; its worktree was retained.',
        );
    const entries = new Map<string, CoderTreeEntry>(
        [...executionAfter].map(([path, hash]) => {
            const [mode, objectId] = hash.split(':');
            return [path, { mode: mode!, objectId: objectId! }];
        }),
    );
    await applyCoderRepositoryFileDelta(executionRoot, boundary.repositoryRoot, entries, pendingPaths);
    const retained = await readCoderWorkingFileHashes(boundary.repositoryRoot, paths, boundary.objectFormat);
    if (paths.some((path) => retained.get(path) !== executionAfter.get(path)))
        throw new CoderGitOperationError(
            'record',
            'Ignored output changed during retention; both execution locations were kept.',
        );
}
