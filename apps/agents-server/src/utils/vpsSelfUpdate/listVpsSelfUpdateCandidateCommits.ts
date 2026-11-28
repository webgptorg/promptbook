import { resolveManagedPromptbookRepositoryDirectory } from './vpsSelfUpdateConfiguration';
import { readConfiguredVpsSelfUpdateOriginRepositoryUrl } from './vpsSelfUpdateOriginRepository';
import { GIT_LOG_FIELD_SEPARATOR, runGitInRepository } from './vpsSelfUpdateRepository';
import type { VpsSelfUpdateCandidateCommit, VpsSelfUpdateCandidateCommitsFilter } from './vpsSelfUpdateTypes';

/**
 * Hard ceiling for the candidate-commit listing to avoid streaming the entire repository to the browser.
 *
 * @private constant of `vpsSelfUpdate`
 */
const VPS_SELF_UPDATE_MAX_CANDIDATE_COMMITS = 500;

/**
 * Default candidate-commit count returned to the browser.
 *
 * @private constant of `vpsSelfUpdate`
 */
const VPS_SELF_UPDATE_DEFAULT_CANDIDATE_COMMITS = 200;

/**
 * Lists commits from the managed repository for the custom-target picker.
 *
 * Fetches the latest refs from the configured upstream first so the picker can include
 * recent commits that have not been deployed yet, then resolves branches/tags per commit.
 *
 * @param filter - Filter applied to the result.
 * @returns Browser-safe commit list.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function listVpsSelfUpdateCandidateCommits(
    filter: VpsSelfUpdateCandidateCommitsFilter = {},
): Promise<ReadonlyArray<VpsSelfUpdateCandidateCommit>> {
    if (process.platform !== 'linux') {
        return [];
    }

    const repositoryDirectory = await resolveManagedPromptbookRepositoryDirectory();
    if (!repositoryDirectory) {
        return [];
    }

    const originRepositoryUrl = await readConfiguredVpsSelfUpdateOriginRepositoryUrl();
    await runGitInRepository(repositoryDirectory, [
        'fetch',
        '--no-tags',
        '--prune',
        '--depth=200',
        originRepositoryUrl,
        '+refs/heads/*:refs/remotes/origin/*',
    ]);
    await runGitInRepository(repositoryDirectory, [
        'fetch',
        '--tags',
        '--force',
        originRepositoryUrl,
        '+refs/tags/*:refs/tags/*',
    ]);

    const limit = clampVpsSelfUpdateCandidateCommitLimit(filter.limit);
    const gitLogArguments = [
        'log',
        `--max-count=${VPS_SELF_UPDATE_MAX_CANDIDATE_COMMITS}`,
        '--all',
        `--format=%H${GIT_LOG_FIELD_SEPARATOR}%aI${GIT_LOG_FIELD_SEPARATOR}%an${GIT_LOG_FIELD_SEPARATOR}%ae${GIT_LOG_FIELD_SEPARATOR}%s`,
    ];

    if (filter.authoredAfter) {
        gitLogArguments.push(`--since=${filter.authoredAfter}`);
    }
    if (filter.authoredBefore) {
        gitLogArguments.push(`--until=${filter.authoredBefore}`);
    }

    const gitLogOutput = await runGitInRepository(repositoryDirectory, gitLogArguments);
    if (!gitLogOutput) {
        return [];
    }

    const branchesByCommit = await readVpsSelfUpdateRefsByCommit(repositoryDirectory, 'refs/remotes/origin');
    const tagsByCommit = await readVpsSelfUpdateRefsByCommit(repositoryDirectory, 'refs/tags');
    const searchText = filter.searchText?.trim().toLowerCase() || '';

    const commits: Array<VpsSelfUpdateCandidateCommit> = [];
    for (const line of gitLogOutput.split('\n')) {
        if (!line) {
            continue;
        }

        const fields = line.split(GIT_LOG_FIELD_SEPARATOR);
        const commitSha = fields[0] ?? '';
        if (!commitSha) {
            continue;
        }

        const authoredAt = fields[1] ?? '';
        const authorName = fields[2] ?? '';
        const authorEmail = fields[3] ?? '';
        const subject = fields.slice(4).join(GIT_LOG_FIELD_SEPARATOR);
        const branches = branchesByCommit.get(commitSha) ?? [];
        const tags = tagsByCommit.get(commitSha) ?? [];

        if (
            searchText &&
            !matchesVpsSelfUpdateCandidateCommitSearchText(searchText, commitSha, subject, authorName, branches, tags)
        ) {
            continue;
        }

        commits.push({
            commitSha,
            shortCommitSha: commitSha.slice(0, 7),
            subject,
            authorName,
            authorEmail,
            authoredAt,
            branches,
            tags,
            isReleaseTag: tags.length > 0,
        });

        if (commits.length >= limit) {
            break;
        }
    }

    return commits;
}

/**
 * Clamps an external limit value to the safe candidate-commit range.
 *
 * @param value - Raw user-provided limit.
 * @returns Clamped value.
 */
function clampVpsSelfUpdateCandidateCommitLimit(value: number | null | undefined): number {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return VPS_SELF_UPDATE_DEFAULT_CANDIDATE_COMMITS;
    }

    return Math.max(1, Math.min(VPS_SELF_UPDATE_MAX_CANDIDATE_COMMITS, Math.floor(value)));
}

/**
 * Returns `true` when one commit matches the free-text filter applied to the picker.
 *
 * @param searchText - Lower-cased search text.
 * @param commitSha - Full commit hash.
 * @param subject - Commit subject.
 * @param authorName - Author display name.
 * @param branches - Branches pointing at the commit.
 * @param tags - Tags pointing at the commit.
 * @returns `true` when the commit should be included.
 */
function matchesVpsSelfUpdateCandidateCommitSearchText(
    searchText: string,
    commitSha: string,
    subject: string,
    authorName: string,
    branches: ReadonlyArray<string>,
    tags: ReadonlyArray<string>,
): boolean {
    if (commitSha.toLowerCase().startsWith(searchText)) {
        return true;
    }

    if (subject.toLowerCase().includes(searchText)) {
        return true;
    }

    if (authorName.toLowerCase().includes(searchText)) {
        return true;
    }

    if (branches.some((branch) => branch.toLowerCase().includes(searchText))) {
        return true;
    }

    return tags.some((tag) => tag.toLowerCase().includes(searchText));
}

/**
 * Reads refs grouped by commit hash so the picker can annotate each commit with its branches/tags.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param refPrefix - Ref namespace passed to `git for-each-ref` (e.g. `refs/tags`).
 * @returns Map keyed by commit hash.
 */
async function readVpsSelfUpdateRefsByCommit(
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
