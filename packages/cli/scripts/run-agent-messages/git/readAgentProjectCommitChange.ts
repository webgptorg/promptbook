import type {
    AgentMessageProjectChange,
    AgentMessageProjectChangedFile,
} from '../../../src/utils/agent-message-runtime/AgentMessageProjectChange';
import { runAgentProjectGitCommand } from './runAgentProjectGitCommand';

/**
 * Largest diff carried into a chat, so one huge commit cannot bloat every message payload.
 */
const AGENT_PROJECT_DIFF_MAX_LENGTH = 20000;

/**
 * Describes the latest commit of one agent project repository.
 *
 * @param options - Project directory and the project name the description is reported under.
 * @returns Description of the commit, or `null` when git could not describe it.
 */
export async function readAgentProjectCommitChange(options: {
    readonly projectPath: string;
    readonly projectName: string;
}): Promise<AgentMessageProjectChange | null> {
    const { projectPath, projectName } = options;
    const [commitHashResult, committedAtResult, numstatResult, diffResult] = await Promise.all([
        runAgentProjectGitCommand({ projectPath, args: ['rev-parse', 'HEAD'] }),
        runAgentProjectGitCommand({ projectPath, args: ['show', '--no-patch', '--format=%cI', 'HEAD'] }),
        runAgentProjectGitCommand({ projectPath, args: ['show', '--numstat', '--format=', 'HEAD'] }),
        runAgentProjectGitCommand({ projectPath, args: ['show', '--patch', '--format=', 'HEAD'] }),
    ]);

    if (!commitHashResult.isSuccessful || commitHashResult.output.trim().length === 0) {
        return null;
    }

    const changedFiles = parseAgentProjectNumstat(numstatResult.isSuccessful ? numstatResult.output : '');
    const diff = diffResult.isSuccessful ? diffResult.output : '';

    return {
        projectName,
        commitHash: commitHashResult.output.trim(),
        committedAt: resolveCommittedAt(committedAtResult.isSuccessful ? committedAtResult.output : ''),
        changedFiles,
        insertionCount: sumChangedFileCounts(changedFiles, 'insertionCount'),
        deletionCount: sumChangedFileCounts(changedFiles, 'deletionCount'),
        diff: diff.slice(0, AGENT_PROJECT_DIFF_MAX_LENGTH),
        isDiffTruncated: diff.length > AGENT_PROJECT_DIFF_MAX_LENGTH,
    };
}

/**
 * Parses the `git show --numstat` output into changed files.
 *
 * Binary files report `-` instead of line counts, which is kept as a zero-line change so the file
 * is still listed as touched.
 *
 * @param numstatOutput - Raw numstat output.
 * @returns Changed files in the order git reported them.
 *
 * @private helper of `readAgentProjectCommitChange`
 */
function parseAgentProjectNumstat(numstatOutput: string): ReadonlyArray<AgentMessageProjectChangedFile> {
    return numstatOutput
        .split(/\r?\n/u)
        .map((numstatLine) => numstatLine.split('\t'))
        .filter((numstatColumns) => numstatColumns.length >= 3 && numstatColumns[2]!.trim().length > 0)
        .map((numstatColumns) => ({
            path: numstatColumns.slice(2).join('\t').trim(),
            insertionCount: parseChangedLineCount(numstatColumns[0]!),
            deletionCount: parseChangedLineCount(numstatColumns[1]!),
        }));
}

/**
 * Parses one numstat line count.
 *
 * @param rawLineCount - Raw numstat column.
 * @returns Parsed count, or `0` for binary files and unparseable columns.
 *
 * @private helper of `readAgentProjectCommitChange`
 */
function parseChangedLineCount(rawLineCount: string): number {
    const parsedLineCount = Number.parseInt(rawLineCount.trim(), 10);

    return Number.isFinite(parsedLineCount) && parsedLineCount >= 0 ? parsedLineCount : 0;
}

/**
 * Sums one line-count field across all changed files.
 *
 * @param changedFiles - Changed files of the commit.
 * @param countName - Field to sum.
 * @returns Total count.
 *
 * @private helper of `readAgentProjectCommitChange`
 */
function sumChangedFileCounts(
    changedFiles: ReadonlyArray<AgentMessageProjectChangedFile>,
    countName: 'insertionCount' | 'deletionCount',
): number {
    return changedFiles.reduce((total, changedFile) => total + changedFile[countName], 0);
}

/**
 * Normalizes the commit timestamp git reported.
 *
 * @param rawCommittedAt - Raw ISO timestamp from git.
 * @returns Usable ISO timestamp, falling back to the current time when git reported none.
 *
 * @private helper of `readAgentProjectCommitChange`
 */
function resolveCommittedAt(rawCommittedAt: string): string {
    const trimmedCommittedAt = rawCommittedAt.trim();

    if (trimmedCommittedAt.length === 0 || !Number.isFinite(Date.parse(trimmedCommittedAt))) {
        return new Date().toISOString();
    }

    return new Date(trimmedCommittedAt).toISOString();
}
