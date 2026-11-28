import {
    $resolveWorkspaceRepository,
    type WorkspaceRepositoryContext,
} from '../../../src/cli/cli-commands/common/workspaceRepository';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { WorkingTreeChangesSnapshot } from './workingTreeChanges';
import { captureWorkingTreeChangesSnapshot, listFilesChangedSinceSnapshot } from './workingTreeChanges';
import {
    captureCoderRepositorySnapshot,
    listCoderTreeDelta,
    type CoderRepositorySnapshot,
} from './coderRepositorySnapshot';
import { CoderGitOperationError } from './CoderGitOperationError';

/**
 * Working tree state captured right before one `ptbk coder` operation starts changing the project.
 *
 * Note: This is the single mechanism which every `ptbk coder` command uses to commit only the files relevant
 *       for the operation it has just performed, instead of everything which happens to be changed in the project.
 */
export type CoderCommitScope = {
    /**
     * Project the operation runs in.
     */
    readonly projectPath: string;

    /** Enclosing Git root used for repository-relative snapshots and pathspecs. */
    readonly repositoryRoot?: string;

    /**
     * Files which were already changed before the operation started.
     */
    readonly snapshotBeforeOperation: WorkingTreeChangesSnapshot;
    /** Content/index ownership boundary needed to persist successive versions of the same path. */
    readonly repositorySnapshot?: CoderRepositorySnapshot;
    /** Protected user boundary carried through uncommitted check/repair/queue phases of the same job. */
    readonly ownershipSnapshot?: CoderRepositorySnapshot;
};

/**
 * Captures the working tree state before one `ptbk coder` operation changes anything.
 *
 * The captured scope is passed to the commit of the very same operation, which then commits exactly the files
 * this operation has created, changed, moved or deleted.
 */
export async function captureCoderCommitScope(
    project: string | WorkspaceRepositoryContext,
    options?: { readonly isContentSnapshotRequired?: boolean; readonly excludePaths?: ReadonlyArray<string> },
): Promise<CoderCommitScope> {
    const workspace = typeof project === 'string' ? await $resolveWorkspaceRepository(project) : project;
    const { projectPath, repositoryRoot } = workspace;
    if (!repositoryRoot)
        throw new NotAllowed(
            'A Git working tree is required to capture the command commit scope. Run `ptbk init` first.',
        );
    return {
        projectPath,
        repositoryRoot,
        snapshotBeforeOperation: await captureWorkingTreeChangesSnapshot(repositoryRoot),
        ...(options?.isContentSnapshotRequired
            ? { repositorySnapshot: await captureCoderRepositorySnapshot(repositoryRoot, options.excludePaths) }
            : {}),
    };
}

/**
 * Carries proven Coder-owned content into the next no-commit phase. An unchanged filename is insufficient:
 * new user bytes, staging entries or flags since the last retained boundary become protected user work.
 */
export function continueCoderCommitScopeOwnership(
    scope: CoderCommitScope,
    previous?: CoderCommitScope,
    ownedPreparationPaths: ReadonlyArray<string> = [],
): CoderCommitScope {
    if (!previous?.repositorySnapshot || !scope.repositorySnapshot) return scope;
    const current = scope.repositorySnapshot;
    const retained = previous.repositorySnapshot;
    const ownership = previous.ownershipSnapshot ?? retained;
    if (current.repositoryRoot !== ownership.repositoryRoot)
        throw new CoderGitOperationError(
            'record',
            'Cannot carry phase ownership between different execution repositories.',
        );
    if (current.head !== retained.head)
        throw new CoderGitOperationError(
            'record',
            'Git history changed between uncommitted phases. The retained work cannot be attributed safely; inspect the recovery trees before resuming persistence.',
        );
    const newUserPaths = new Set([
        ...listCoderTreeDelta(retained.entries, current.entries),
        ...listCoderTreeDelta(retained.indexEntries, current.indexEntries),
        ...[...new Set([...retained.indexFlags.keys(), ...current.indexFlags.keys()])].filter(
            (path) => retained.indexFlags.get(path) !== current.indexFlags.get(path),
        ),
    ]);
    for (const path of ownedPreparationPaths) newUserPaths.delete(path);
    return {
        ...scope,
        ownershipSnapshot: { ...ownership, dirtyPaths: [...new Set([...ownership.dirtyPaths, ...newUserPaths])] },
    };
}

/**
 * Resolves the repository-relative paths which one `ptbk coder` operation has really changed.
 *
 * Files which were already changed before the operation started and which the operation did not touch are
 * never part of the result, so they stay in the working tree instead of being swept into the commit.
 */
export async function resolveCoderCommitScopePaths(scope: CoderCommitScope): Promise<ReadonlyArray<string>> {
    return listFilesChangedSinceSnapshot(scope.repositoryRoot ?? scope.projectPath, scope.snapshotBeforeOperation);
}
