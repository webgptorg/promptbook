import { setTimeout as waitForTimeout } from 'timers/promises';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';

/** Snapshot diff arguments which cannot write output files or invoke external diff programs. */
const INDEX_DIFF_ARGUMENTS = new Set(['diff', '--name-only', '--no-renames', '--cached', '-z', '--']);
/** Brief Windows file-sharing failures must not make an otherwise verified snapshot fail intermittently. */
const INDEX_READ_RETRY_DELAYS_MS = [50, 100, 200, 400] as const;

/** Limits retries to index listings and the snapshot service's exact name-only diff options. */
function isReadOnlyIndexInspection(argumentsList: ReadonlyArray<string>): boolean {
    return (
        argumentsList[0] === 'ls-files' ||
        (argumentsList[0] === 'diff' &&
            argumentsList.includes('--name-only') &&
            argumentsList.every((argument) => INDEX_DIFF_ARGUMENTS.has(argument)))
    );
}

/**
 * Uses the shared Git service, retrying only a Windows index-open permission failure during a read-only inspection.
 * Persistent access errors and every mutation still fail normally. Snapshot callers retain their before/after
 * comparisons, so a retry cannot publish content which changed during capture.
 */
export async function runWorkspaceGitWithIndexReadRetry(
    projectPath: string,
    argumentsList: ReadonlyArray<string>,
    options?: Parameters<typeof $runWorkspaceGit>[2],
): Promise<string> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await $runWorkspaceGit(projectPath, argumentsList, options);
        } catch (error) {
            const stderr = (error as { stderr?: unknown } | undefined)?.stderr;
            const delay = INDEX_READ_RETRY_DELAYS_MS[attempt];
            if (
                process.platform !== 'win32' ||
                options?.signal?.aborted ||
                !isReadOnlyIndexInspection(argumentsList) ||
                delay === undefined ||
                typeof stderr !== 'string' ||
                !/^fatal: [^\r\n]*index file open failed: Permission denied\r?$/mu.test(stderr)
            ) {
                throw error;
            }
            await waitForTimeout(delay);
        }
    }
}
