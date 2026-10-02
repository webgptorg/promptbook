import {
    $resolveWorkspaceRepository,
    type WorkspaceRepositoryContext,
} from '../../../src/cli/cli-commands/common/workspaceRepository';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { WorkingTreeChangesSnapshot } from './workingTreeChanges';
import { captureWorkingTreeChangesSnapshot, listFilesChangedSinceSnapshot } from './workingTreeChanges';

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
};

/**
 * Captures the working tree state before one `ptbk coder` operation changes anything.
 *
 * The captured scope is passed to the commit of the very same operation, which then commits exactly the files
 * this operation has created, changed, moved or deleted.
 */
export async function captureCoderCommitScope(project: string | WorkspaceRepositoryContext): Promise<CoderCommitScope> {
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
