import { execFile } from 'child_process';
import { promisify } from 'util';
import type { VpsSelfUpdatePendingCommit } from './vpsSelfUpdateTypes';

const execFileAsync = promisify(execFile);

/**
 * Field separator used between commit fields in the `git log` machine output.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const GIT_LOG_FIELD_SEPARATOR = '\x1f';

/**
 * Hard ceiling for the pending-commits listing returned in the overview to avoid huge payloads on a long-stale server.
 */
const VPS_SELF_UPDATE_MAX_PENDING_COMMITS = 100;

/**
 * Number of latest branch commits fetched for the update overview.
 */
const VPS_SELF_UPDATE_OVERVIEW_FETCH_DEPTH = VPS_SELF_UPDATE_MAX_PENDING_COMMITS + 1;

/**
 * Browser-safe metadata read from one git commit object.
 */
type VpsSelfUpdateCommitMetadata = {
    /**
     * Full commit hash.
     */
    readonly commitSha: string;
    /**
     * Single-line commit subject.
     */
    readonly subject: string;
    /**
     * Author timestamp in ISO format or `null` when unknown.
     */
    readonly authoredAt: string | null;
};

/**
 * Executes one git command in the managed repository.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param args - Arguments passed to `git`.
 * @returns Trimmed stdout or `null` when the command fails.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function runGitInRepository(repositoryDirectory: string, args: ReadonlyArray<string>): Promise<string | null> {
    try {
        const { stdout } = await execFileAsync('git', ['-C', repositoryDirectory, ...args], {
            maxBuffer: 1024 * 1024,
        });
        return stdout.trim() || null;
    } catch {
        return null;
    }
}

/**
 * Fetches the tracked remote branch into the local object database before building the browser overview.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param branch - Target branch.
 * @param originRepositoryUrl - Configured upstream repository URL.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function refreshVpsSelfUpdateRemoteBranch(
    repositoryDirectory: string,
    branch: string,
    originRepositoryUrl: string,
): Promise<void> {
    if (!branch) {
        return;
    }

    await runGitInRepository(repositoryDirectory, [
        'fetch',
        '--no-tags',
        '--prune',
        `--depth=${VPS_SELF_UPDATE_OVERVIEW_FETCH_DEPTH}`,
        originRepositoryUrl,
        `+refs/heads/${branch}:${createVpsSelfUpdateRemoteBranchReference(branch)}`,
    ]);
}

/**
 * Reads the latest tracked-branch commit from the local remote-tracking ref, falling back to `ls-remote`.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param branch - Target branch.
 * @param originRepositoryUrl - Configured upstream repository URL.
 * @returns Remote branch commit sha or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readLatestRemoteBranchCommitSha(
    repositoryDirectory: string,
    branch: string,
    originRepositoryUrl: string,
): Promise<string | null> {
    if (!branch) {
        return null;
    }

    const remoteBranchReference = createVpsSelfUpdateRemoteBranchReference(branch);
    const localCommitSha = await runGitInRepository(repositoryDirectory, [
        'rev-parse',
        '--verify',
        `${remoteBranchReference}^{commit}`,
    ]);

    return localCommitSha || readRemoteCommitSha(repositoryDirectory, branch, originRepositoryUrl);
}

/**
 * Reads the latest remote branch commit without mutating the local checkout.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param branch - Target branch.
 * @param originRepositoryUrl - Configured upstream repository URL.
 * @returns Remote commit sha or `null`.
 */
async function readRemoteCommitSha(
    repositoryDirectory: string,
    branch: string,
    originRepositoryUrl: string,
): Promise<string | null> {
    if (!branch) {
        return null;
    }

    const output = await runGitInRepository(repositoryDirectory, [
        'ls-remote',
        originRepositoryUrl,
        `refs/heads/${branch}`,
    ]);
    return output?.split(/\s+/u)[0] || null;
}

/**
 * Creates the local remote-tracking reference used for the update overview fetch.
 *
 * @param branch - Target branch.
 * @returns Local remote-tracking reference.
 */
function createVpsSelfUpdateRemoteBranchReference(branch: string): string {
    return `refs/remotes/origin/${branch}`;
}

/**
 * Reads hash, subject and author timestamp for one known commit from the local repository.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param commitReference - Commit hash or git revision reference to look up.
 * @returns Commit metadata or `null` when the commit cannot be resolved locally.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readCommitMetadataFromRepository(
    repositoryDirectory: string,
    commitReference: string,
): Promise<VpsSelfUpdateCommitMetadata | null> {
    const output = await runGitInRepository(repositoryDirectory, [
        'log',
        '-1',
        `--format=%H${GIT_LOG_FIELD_SEPARATOR}%aI${GIT_LOG_FIELD_SEPARATOR}%s`,
        commitReference,
    ]);
    if (!output) {
        return null;
    }

    const fields = output.split(GIT_LOG_FIELD_SEPARATOR);
    const commitSha = fields[0] ?? '';
    if (!commitSha) {
        return null;
    }

    return {
        commitSha,
        authoredAt: fields[1] || null,
        subject: fields.slice(2).join(GIT_LOG_FIELD_SEPARATOR),
    };
}

/**
 * Counts how many commits separate two commits in the local repository.
 *
 * Returns `null` when either commit cannot be resolved (typical for a shallow clone that has not been deepened yet).
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param fromCommitSha - Older commit hash.
 * @param toCommitSha - Newer commit hash.
 * @returns Commit count or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function countCommitsBetween(
    repositoryDirectory: string,
    fromCommitSha: string,
    toCommitSha: string,
): Promise<number | null> {
    if (fromCommitSha === toCommitSha) {
        return 0;
    }

    const output = await runGitInRepository(repositoryDirectory, [
        'rev-list',
        '--count',
        `${fromCommitSha}..${toCommitSha}`,
    ]);
    if (output === null) {
        return null;
    }

    const parsedCount = Number.parseInt(output, 10);
    return Number.isFinite(parsedCount) ? parsedCount : null;
}

/**
 * Lists commits that separate two commits in the local repository so the admin UI can show subject/hash/date for each one.
 *
 * Returns an empty list when either commit cannot be resolved (typical for a shallow clone that has not been deepened yet)
 * or when both commits are identical.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param fromCommitSha - Older commit hash (deployed commit).
 * @param toCommitSha - Newer commit hash (latest remote commit).
 * @returns Browser-safe pending-commit list (newest first).
 *
 * @private function of `vpsSelfUpdate`
 */
export async function listCommitsBetween(
    repositoryDirectory: string,
    fromCommitSha: string,
    toCommitSha: string,
): Promise<ReadonlyArray<VpsSelfUpdatePendingCommit>> {
    if (fromCommitSha === toCommitSha) {
        return [];
    }

    const output = await runGitInRepository(repositoryDirectory, [
        'log',
        `--max-count=${VPS_SELF_UPDATE_MAX_PENDING_COMMITS}`,
        `--format=%H${GIT_LOG_FIELD_SEPARATOR}%aI${GIT_LOG_FIELD_SEPARATOR}%s`,
        `${fromCommitSha}..${toCommitSha}`,
    ]);
    if (!output) {
        return [];
    }

    const pendingCommits: Array<VpsSelfUpdatePendingCommit> = [];
    for (const line of output.split('\n')) {
        if (!line) {
            continue;
        }

        const fields = line.split(GIT_LOG_FIELD_SEPARATOR);
        const commitSha = fields[0] ?? '';
        if (!commitSha) {
            continue;
        }

        const authoredAt = fields[1] || null;
        const subject = fields.slice(2).join(GIT_LOG_FIELD_SEPARATOR);

        pendingCommits.push({
            commitSha,
            shortCommitSha: commitSha.slice(0, 7),
            subject,
            authoredAt,
        });
    }

    return pendingCommits;
}

/**
 * Reads refs grouped by commit hash so the picker can annotate each commit with its branches/tags.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param refPrefix - Ref namespace passed to `git for-each-ref` (e.g. `refs/tags`).
 * @returns Map keyed by commit hash.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readRefsByCommit(
    repositoryDirectory: string,
    refPrefix: string,
): Promise<Map<string, Array<string>>> {
    const output = await runGitInRepository(repositoryDirectory, [
        'for-each-ref',
        '--format=%(objectname)\x1f%(refname:short)',
        refPrefix,
    ]);
    const refsByCommit = new Map<string, Array<string>>();

    if (!output) {
        return refsByCommit;
    }

    for (const line of output.split('\n')) {
        const [commitSha, refName] = line.split('\x1f');
        if (!commitSha || !refName) {
            continue;
        }

        const cleanRefName = refName.replace(/^origin\//u, '');
        const list = refsByCommit.get(commitSha) ?? [];
        list.push(cleanRefName);
        refsByCommit.set(commitSha, list);
    }

    return refsByCommit;
}
