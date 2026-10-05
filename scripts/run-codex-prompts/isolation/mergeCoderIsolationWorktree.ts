import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import { runGitCommand } from '../git/runGitCommand';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';
import { quoteGitArgument } from '../git/quoteGitArgument';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import {
    areCoderFileHashesEqual,
    assertCoderDeltaIsOwned,
    captureCoderRepositorySnapshot,
    listCoderTreeDelta,
    readCoderTree,
    type CoderRepositorySnapshot,
} from '../git/coderRepositorySnapshot';
import { readCurrentBranchName } from '../git/gitBranchContext';

/**
 * Outcome of merging one isolated task back into the branch the coder runs on.
 */
export type CoderIsolationMergeResult =
    | {
          readonly isMerged: true;
      }
    | {
          readonly isMerged: false;

          /**
           * Raw git output explaining why the merge could not be completed.
           */
          readonly failureDetails: string;
      };

/**
 * Merges the isolated task back into the branch the coder runs on.
 *
 * Fast-forward integration preserves implementation/check/finalization history exactly as verified in
 * the execution checkout. Diverged or overlapping work is retained for manual integration.
 *
 * A refused fast-forward leaves the original working tree untouched and is reported back
 * instead of thrown, because a merge failure must not stop the coder from processing the next task.
 */
export async function mergeCoderIsolationWorktree(
    worktree: CoderIsolationWorktree,
    original?: CoderRepositorySnapshot,
    signal?: AbortSignal,
): Promise<CoderIsolationMergeResult> {
    signal?.throwIfAborted();
    const execution = original ? await captureCoderRepositorySnapshot(worktree.worktreePath) : undefined;
    if (original && execution) {
        const current = await captureCoderRepositorySnapshot(original.repositoryRoot);
        if (
            current.head !== original.head ||
            current.indexFingerprint !== original.indexFingerprint ||
            !areCoderFileHashesEqual(current.workingFileHashes, original.workingFileHashes) ||
            (await readCurrentBranchName(original.repositoryRoot)) !== worktree.baseBranchName
        )
            throw new CoderGitOperationError(
                'record',
                'The original checkout changed during isolated execution. Its user content and the execution worktree were retained; integrate the verified commits manually.',
            );
        if (execution.dirtyPaths.length || !execution.head)
            throw new CoderGitOperationError(
                'record',
                'The execution worktree contains uncommitted changes. It was retained instead of integrating an incomplete tree.',
            );
        const originalHead = original.head ? await readCoderTree(original.repositoryRoot, original.head) : new Map();
        const executionHead = await readCoderTree(original.repositoryRoot, execution.head);
        assertCoderDeltaIsOwned(original, listCoderTreeDelta(originalHead, executionHead), originalHead);
    }
    try {
        await runGitCommand({
            command: `git merge --ff-only ${quoteGitArgument(
                execution?.head ?? worktree.branchName,
                process.platform !== 'win32' || Boolean(signal),
            )}`,
            cwd: worktree.projectPath,
            ...(signal ? { signal } : {}),
        });
    } catch (error) {
        if (original) {
            const retained = await captureCoderRepositorySnapshot(original.repositoryRoot);
            if (
                retained.head !== original.head ||
                retained.indexFingerprint !== original.indexFingerprint ||
                !areCoderFileHashesEqual(retained.workingFileHashes, original.workingFileHashes)
            ) {
                throw new CoderGitOperationError(
                    'record',
                    'A failed isolated integration changed the original checkout. Both checkouts were retained; inspect the actual Git state before resuming.',
                );
            }
        }
        signal?.throwIfAborted();
        return { isMerged: false, failureDetails: formatUnknownErrorMessage(error) };
    }
    if (original && execution) await verifyIntegratedContent(original, execution);
    return { isMerged: true };
}

/** Verifies hooks and checkout transformations did not change the retained verified result or user index. */
async function verifyIntegratedContent(
    original: CoderRepositorySnapshot,
    execution: CoderRepositorySnapshot,
): Promise<void> {
    const current = await captureCoderRepositorySnapshot(original.repositoryRoot);
    const originalHead = original.head ? await readCoderTree(original.repositoryRoot, original.head) : new Map();
    const executionHead = await readCoderTree(original.repositoryRoot, execution.head!);
    const integratedPaths = listCoderTreeDelta(originalHead, executionHead);
    const expectedIndex = new Map(original.indexEntries);
    const expectedFlags = new Map(original.indexFlags);
    const expectedFiles = new Map(original.workingFileHashes);
    for (const path of integratedPaths) {
        const entry = executionHead.get(path);
        if (entry) {
            expectedIndex.set(path, entry);
            expectedFlags.set(path, 'H');
        } else {
            expectedIndex.delete(path);
            expectedFlags.delete(path);
        }
        const hash = execution.workingFileHashes.get(path);
        if (hash) expectedFiles.set(path, hash);
        else expectedFiles.delete(path);
    }
    if (
        current.head !== execution.head ||
        listCoderTreeDelta(expectedIndex, current.indexEntries).length ||
        !areCoderFileHashesEqual(expectedFlags, current.indexFlags) ||
        !areCoderFileHashesEqual(expectedFiles, current.workingFileHashes)
    )
        throw new CoderGitOperationError(
            'record',
            'A Git hook, checkout transformation or concurrent writer changed isolated integration. The resulting checkout is not verified; both history and the execution worktree were retained.',
        );
}
