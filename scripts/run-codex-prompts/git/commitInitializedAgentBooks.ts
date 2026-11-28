import { resolve } from 'path';
import type { WorkspaceRepositoryContext } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { commitChanges } from './commitChanges';
import { listWorkingTreeChangedFiles } from './workingTreeChanges';

/**
 * Commits newly initialized, non-ignored agent books before the coder's clean-tree checkpoint.
 * Only books created by this run are eligible; existing books and unrelated changes remain outside the commit.
 */
export async function commitInitializedAgentBooks(
    projectPath: string,
    createdAgentBookPaths: ReadonlyArray<string>,
    workspace?: WorkspaceRepositoryContext,
): Promise<void> {
    if (createdAgentBookPaths.length === 0) {
        return;
    }

    const repositoryRoot = workspace?.repositoryRoot ?? projectPath;
    const createdPaths = new Set(createdAgentBookPaths.map((filePath) => resolve(projectPath, filePath)));
    const changedPaths = await listWorkingTreeChangedFiles(repositoryRoot);
    const relevantPaths = changedPaths.filter((filePath) => createdPaths.has(resolve(repositoryRoot, filePath)));
    if (relevantPaths.length === 0) {
        return;
    }

    await commitChanges('Initialize Adam agent', { projectPath: repositoryRoot, relevantPaths });
}
