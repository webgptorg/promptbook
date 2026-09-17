import { resolve } from 'path';
import { commitChanges } from './commitChanges';
import { listWorkingTreeChangedFiles } from './workingTreeChanges';

/**
 * Commits newly initialized, non-ignored agent books before the coder's clean-tree checkpoint.
 * Only books created by this run are eligible; existing books and unrelated changes remain outside the commit.
 */
export async function commitInitializedAgentBooks(
    projectPath: string,
    createdAgentBookPaths: ReadonlyArray<string>,
): Promise<void> {
    if (createdAgentBookPaths.length === 0) {
        return;
    }

    const createdPaths = new Set(createdAgentBookPaths.map((filePath) => resolve(filePath)));
    const changedPaths = await listWorkingTreeChangedFiles(projectPath);
    const relevantPaths = changedPaths.filter((filePath) => createdPaths.has(resolve(projectPath, filePath)));
    if (relevantPaths.length === 0) {
        return;
    }

    await commitChanges('Initialize Adam agent', { projectPath, relevantPaths });
}
