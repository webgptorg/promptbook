import { execFile, spawn } from 'child_process';
import { constants as filesystemConstants } from 'fs';
import { access, mkdir, open, readFile, stat, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { promisify } from 'util';
import { NotAllowed } from '../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';
import {
    createVpsInstallerCommandEnvironment,
    resolveVpsEnvironmentFilePath,
    resolveVpsInstallerScriptPath,
} from './vpsConfiguration';

const execFileAsync = promisify(execFile);

/**
 * Fallback error used when a running self-update process disappears without writing a terminal status.
 */
const VPS_SELF_UPDATE_STALE_ERROR_MESSAGE =
    'The previous background update process stopped unexpectedly before writing its final status.';

/**
 * Success step shown when the server proves a stale-looking job completed across a process restart.
 */
const VPS_SELF_UPDATE_RESTART_SUCCESS_STEP =
    'Standalone VPS self-update finished successfully after restarting the server.';

/**
 * Default upstream repository URL used when no custom origin is configured.
 */
export const VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL = 'https://github.com/webgptorg/promptbook.git';

/**
 * Identifier of the synthetic environment that allows targeting an arbitrary git ref.
 */
export const VPS_SELF_UPDATE_CUSTOM_ENVIRONMENT_ID = 'custom' as const;

/**
 * Supported standalone VPS update environments.
 *
 * Order matters: it is the order presented to the super-admin in the UI.
 */
export const VPS_SELF_UPDATE_ENVIRONMENTS = [
    {
        id: 'main',
        branch: 'main',
        label: 'Live',
        description: 'Tracks the latest commit from the main development branch.',
        isCustom: false,
    },
    {
        id: 'preview',
        branch: 'preview',
        label: 'Preview',
        description: 'Follows the preview branch before changes reach production.',
        isCustom: false,
    },
    {
        id: 'production',
        branch: 'production',
        label: 'Production',
        description: 'Recommended stable deployment branch for standalone servers.',
        isCustom: false,
    },
    {
        id: 'lts',
        branch: 'lts',
        label: 'LTS',
        description: 'Keeps the server on the long-term-support branch.',
        isCustom: false,
    },
    {
        id: VPS_SELF_UPDATE_CUSTOM_ENVIRONMENT_ID,
        branch: '',
        label: 'Custom',
        description: 'Pick an arbitrary commit, tag, or branch — advanced and potentially unstable.',
        isCustom: true,
    },
] as const;

/**
 * Allowed standalone VPS update environment id.
 */
export type VpsSelfUpdateEnvironmentId = (typeof VPS_SELF_UPDATE_ENVIRONMENTS)[number]['id'];

/**
 * One environment option returned to the browser.
 */
export type VpsSelfUpdateEnvironmentOption = (typeof VPS_SELF_UPDATE_ENVIRONMENTS)[number];

/**
 * Persisted self-update job status.
 */
export type VpsSelfUpdateJobStatus = 'idle' | 'running' | 'succeeded' | 'failed';

/**
 * Snapshot of the latest standalone VPS self-update job.
 */
export type VpsSelfUpdateJobSnapshot = {
    /**
     * Last known job status.
     */
    readonly status: VpsSelfUpdateJobStatus;
    /**
     * Background process id when available.
     */
    readonly pid: number | null;
    /**
     * Selected target branch for the running or last completed job.
     */
    readonly targetBranch: string | null;
    /**
     * Resolved target environment metadata.
     */
    readonly targetEnvironment: VpsSelfUpdateEnvironmentOption;
    /**
     * Human-readable current step.
     */
    readonly currentStep: string | null;
    /**
     * Current deployed commit recorded by the installer script.
     */
    readonly currentCommitSha: string | null;
    /**
     * Target remote commit recorded by the installer script.
     */
    readonly targetCommitSha: string | null;
    /**
     * Error message when the job failed.
     */
    readonly errorMessage: string | null;
    /**
     * Start time of the job in ISO format.
     */
    readonly startedAt: string | null;
    /**
     * Finish time of the job in ISO format.
     */
    readonly finishedAt: string | null;
    /**
     * Whether the job claims to be running even though its process is gone.
     */
    readonly isStale: boolean;
    /**
     * Tail of the persisted installer log.
     */
    readonly logTail: string | null;
    /**
     * Absolute log-file path when known.
     */
    readonly logFilePath: string | null;
};

/**
 * Browser-safe self-update overview shown on the Update page.
 */
export type VpsSelfUpdateOverview = {
    /**
     * Whether self-update can run on the current host.
     */
    readonly isAvailable: boolean;
    /**
     * Human-readable reason when self-update is unavailable.
     */
    readonly unavailableReason: string | null;
    /**
     * Available deployment environments.
     */
    readonly environments: ReadonlyArray<VpsSelfUpdateEnvironmentOption>;
    /**
     * Currently configured deployment environment.
     */
    readonly currentEnvironment: VpsSelfUpdateEnvironmentOption;
    /**
     * Absolute path to the managed Promptbook repository.
     */
    readonly repositoryDirectory: string | null;
    /**
     * Current local repository commit.
     */
    readonly currentCommitSha: string | null;
    /**
     * Short local repository commit.
     */
    readonly currentCommitShortSha: string | null;
    /**
     * Current local repository commit subject.
     */
    readonly currentCommitMessage: string | null;
    /**
     * Author timestamp of the currently deployed commit in ISO format.
     */
    readonly currentCommitDate: string | null;
    /**
     * Latest remote commit on the selected branch.
     */
    readonly latestRemoteCommitSha: string | null;
    /**
     * Short latest remote commit.
     */
    readonly latestRemoteCommitShortSha: string | null;
    /**
     * Author timestamp of the latest remote commit in ISO format.
     */
    readonly latestRemoteCommitDate: string | null;
    /**
     * Number of commits the deployed checkout is behind the latest remote commit, or `null` when unknown.
     */
    readonly commitsBehindCount: number | null;
    /**
     * Whether the remote branch contains a newer commit than the deployed checkout.
     */
    readonly isUpdateAvailable: boolean;
    /**
     * Configured upstream repository URL (defaults to `webgptorg/promptbook`).
     */
    readonly originRepositoryUrl: string;
    /**
     * Whether the configured origin matches the default upstream repository.
     */
    readonly isOriginRepositoryDefault: boolean;
    /**
     * Default upstream repository URL.
     */
    readonly defaultOriginRepositoryUrl: string;
    /**
     * Latest persisted update-job state.
     */
    readonly job: VpsSelfUpdateJobSnapshot;
};

/**
 * Repository state used to resolve a persisted self-update job for the browser overview.
 */
export type VpsSelfUpdateJobOverviewContext = {
    /**
     * Environment currently configured in the running Agents Server.
     */
    readonly currentEnvironment: VpsSelfUpdateEnvironmentOption;
    /**
     * Current local repository commit observed by the running server.
     */
    readonly currentCommitSha: string | null;
};

/**
 * Request payload accepted by {@link startVpsSelfUpdate}.
 */
export type VpsSelfUpdateStartRequest = {
    /**
     * Predefined environment id (e.g. `production`) or `custom` to target an arbitrary ref.
     */
    readonly environmentId: string;
    /**
     * Optional arbitrary commit hash, tag, or branch used when `environmentId === 'custom'`.
     */
    readonly customRef?: string | null;
    /**
     * Optional override of the upstream repository URL (must be a `https://` git URL).
     */
    readonly originRepositoryUrl?: string | null;
};

/**
 * Starts one detached VPS self-update run for the selected environment.
 *
 * The actual update is executed by `other/vps/install.sh self-update`, while this
 * helper writes the initial persisted state and detaches the background process so
 * the triggering HTTP request can finish before pm2 restarts the server.
 *
 * @param request - Update request payload.
 * @returns Fresh overview including the running background job.
 */
export async function startVpsSelfUpdate(request: VpsSelfUpdateStartRequest): Promise<VpsSelfUpdateOverview> {
    if (process.platform !== 'linux') {
        throw new NotAllowed(
            spaceTrim(`
                Self-update is available only on the standalone Linux VPS deployment.
            `),
        );
    }

    const targetEnvironment = resolveVpsSelfUpdateEnvironment(request.environmentId);
    const isCustomEnvironment = targetEnvironment.isCustom;
    const targetRef = isCustomEnvironment ? normalizeArbitraryRef(request.customRef) : targetEnvironment.branch;

    if (isCustomEnvironment && !targetRef) {
        throw new NotAllowed(
            spaceTrim(`
                A custom self-update requires a non-empty target ref (commit hash, tag, or branch).
            `),
        );
    }

    const requestedOriginUrl = normalizeOriginRepositoryUrl(request.originRepositoryUrl);
    if (requestedOriginUrl !== null) {
        await persistVpsSelfUpdateOriginRepositoryUrl(requestedOriginUrl);
    }

    const originRepositoryUrl =
        requestedOriginUrl || (await readConfiguredVpsSelfUpdateOriginRepositoryUrl());

    const currentJob = await readPersistedVpsSelfUpdateJob();
    if (currentJob.status === 'running' && !currentJob.isStale) {
        throw new NotAllowed(
            spaceTrim(`
                A standalone VPS self-update is already running.
            `),
        );
    }

    const scriptPath = await resolveVpsInstallerScriptPath();
    if (!scriptPath) {
        throw new Error('The shared VPS installer script could not be found on this server.');
    }

    const statusFilePath = resolveVpsSelfUpdateStatusFilePath();
    const logFilePath = resolveVpsSelfUpdateLogFilePath();
    const startedAt = new Date().toISOString();
    await mkdir(dirname(logFilePath), { recursive: true });
    const logHandle = await open(logFilePath, 'a');

    try {
        const installerArgs = isCustomEnvironment
            ? [scriptPath, 'self-update', '--ref', targetRef]
            : [scriptPath, 'self-update', '--branch', targetRef];

        const child = spawn('bash', installerArgs, {
            detached: true,
            stdio: ['ignore', logHandle.fd, logHandle.fd],
            env: {
                ...createVpsInstallerCommandEnvironment(),
                PTBK_SELF_UPDATE_STATUS_FILE: statusFilePath,
                PTBK_SELF_UPDATE_LOG_FILE: logFilePath,
                PTBK_TARGET_REPOSITORY_REF: targetRef,
                PROMPTBOOK_REPOSITORY_URL: originRepositoryUrl,
            },
        });

        await writeVpsSelfUpdateStatusFile({
            STATUS: 'running',
            PID: String(child.pid ?? ''),
            TARGET_REF: targetRef,
            CURRENT_STEP_B64: encodeStatusField('Queued standalone VPS self-update.'),
            ERROR_MESSAGE_B64: '',
            STARTED_AT: startedAt,
            FINISHED_AT: '',
            CURRENT_COMMIT: '',
            TARGET_COMMIT: '',
            LOG_FILE: logFilePath,
        });

        child.unref();
    } finally {
        await logHandle.close();
    }

    return readVpsSelfUpdateOverview();
}

/**
 * Normalizes one free-form arbitrary git ref entered by the super admin.
 *
 * @param value - Raw user-provided ref.
 * @returns Trimmed ref or empty string when invalid.
 */
function normalizeArbitraryRef(value: string | null | undefined): string {
    const trimmedValue = value?.trim() || '';
    if (!trimmedValue) {
        return '';
    }

    if (!/^[A-Za-z0-9._/-]+$/u.test(trimmedValue)) {
        throw new NotAllowed(
            spaceTrim(`
                The provided git ref \`${trimmedValue}\` contains unsupported characters.

                **Only letters, digits, dots, underscores, slashes, and dashes are allowed.**
            `),
        );
    }

    return trimmedValue;
}

/**
 * Validates a user-provided upstream repository URL.
 *
 * @param value - Raw URL string.
 * @returns Normalized URL or `null` when the user did not request an override.
 */
function normalizeOriginRepositoryUrl(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return null;
    }

    if (!/^https:\/\/[\w.-]+\/[\w./-]+(?:\.git)?$/u.test(trimmedValue)) {
        throw new NotAllowed(
            spaceTrim(`
                The upstream repository URL \`${trimmedValue}\` is not a valid public **https** git URL.
            `),
        );
    }

    return trimmedValue;
}

/**
 * Reads the current standalone VPS self-update overview.
 *
 * @returns Browser-safe update summary for the super-admin UI.
 */
export async function readVpsSelfUpdateOverview(): Promise<VpsSelfUpdateOverview> {
    const currentEnvironment = await readCurrentVpsSelfUpdateEnvironment();
    const repositoryDirectory = await resolveManagedPromptbookRepositoryDirectory();
    const scriptPath = await resolveVpsInstallerScriptPath();
    const job = await readPersistedVpsSelfUpdateJob();
    const originRepositoryUrl = await readConfiguredVpsSelfUpdateOriginRepositoryUrl();

    if (process.platform !== 'linux') {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory,
            job,
            originRepositoryUrl,
            unavailableReason: 'Self-update is available only on the standalone Linux VPS deployment.',
        });
    }

    if (!scriptPath) {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory,
            job,
            originRepositoryUrl,
            unavailableReason: 'The shared VPS installer script could not be found on this server.',
        });
    }

    if (!repositoryDirectory) {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory: null,
            job,
            originRepositoryUrl,
            unavailableReason: 'The managed Promptbook repository directory is not configured on this server.',
        });
    }

    const [currentCommitSha, currentCommitMessage, currentCommitDate, latestRemoteCommitSha] = await Promise.all([
        runGitInRepository(repositoryDirectory, ['rev-parse', 'HEAD']),
        runGitInRepository(repositoryDirectory, ['log', '-1', '--format=%s']),
        runGitInRepository(repositoryDirectory, ['log', '-1', '--format=%aI']),
        readRemoteCommitSha(repositoryDirectory, currentEnvironment.branch, originRepositoryUrl),
    ]);
    const latestRemoteCommitDate = latestRemoteCommitSha
        ? await readCommitDateFromRepository(repositoryDirectory, latestRemoteCommitSha)
        : null;
    const commitsBehindCount =
        currentCommitSha && latestRemoteCommitSha
            ? await countCommitsBetween(repositoryDirectory, currentCommitSha, latestRemoteCommitSha)
            : null;
    const resolvedJob = resolveVpsSelfUpdateJobForOverview(job, {
        currentEnvironment,
        currentCommitSha,
    });

    return {
        isAvailable: Boolean(currentCommitSha),
        unavailableReason: currentCommitSha ? null : 'The managed Promptbook repository checkout is not available.',
        environments: VPS_SELF_UPDATE_ENVIRONMENTS,
        currentEnvironment,
        repositoryDirectory,
        currentCommitSha,
        currentCommitShortSha: abbreviateCommitSha(currentCommitSha),
        currentCommitMessage,
        currentCommitDate,
        latestRemoteCommitSha,
        latestRemoteCommitShortSha: abbreviateCommitSha(latestRemoteCommitSha),
        latestRemoteCommitDate,
        commitsBehindCount,
        isUpdateAvailable: Boolean(
            currentCommitSha && latestRemoteCommitSha && currentCommitSha !== latestRemoteCommitSha,
        ),
        originRepositoryUrl,
        isOriginRepositoryDefault: originRepositoryUrl === VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
        defaultOriginRepositoryUrl: VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
        job: resolvedJob,
    };
}

/**
 * Browser-safe summary of one commit that the super admin can pick from the custom-target picker.
 */
export type VpsSelfUpdateCandidateCommit = {
    /**
     * Full commit hash.
     */
    readonly commitSha: string;
    /**
     * Short commit hash (first 7 chars).
     */
    readonly shortCommitSha: string;
    /**
     * Single-line commit subject.
     */
    readonly subject: string;
    /**
     * Author name.
     */
    readonly authorName: string;
    /**
     * Author email.
     */
    readonly authorEmail: string;
    /**
     * Author timestamp in ISO format.
     */
    readonly authoredAt: string;
    /**
     * Branches that point at this commit (origin-prefixed names stripped).
     */
    readonly branches: ReadonlyArray<string>;
    /**
     * Tags that point at this commit.
     */
    readonly tags: ReadonlyArray<string>;
    /**
     * Whether at least one tag points at the commit (used to flag stable releases).
     */
    readonly isReleaseTag: boolean;
};

/**
 * Filter applied to the candidate-commit listing.
 */
export type VpsSelfUpdateCandidateCommitsFilter = {
    /**
     * Free-text search across subject, author name, hash, branch and tag names.
     */
    readonly searchText?: string | null;
    /**
     * Restrict to commits authored on or after this ISO date.
     */
    readonly authoredAfter?: string | null;
    /**
     * Restrict to commits authored on or before this ISO date.
     */
    readonly authoredBefore?: string | null;
    /**
     * Hard limit on returned commits (default 200).
     */
    readonly limit?: number | null;
};

/**
 * Hard ceiling for the candidate-commit listing to avoid streaming the entire repository to the browser.
 */
const VPS_SELF_UPDATE_MAX_CANDIDATE_COMMITS = 500;

/**
 * Field separator used between commit fields in the `git log` machine output.
 */
const GIT_LOG_FIELD_SEPARATOR = '\x1f';

/**
 * Lists commits from the managed repository for the custom-target picker.
 *
 * Fetches the latest refs from the configured upstream first so the picker can include
 * recent commits that have not been deployed yet, then resolves branches/tags per commit.
 *
 * @param filter - Filter applied to the result.
 * @returns Browser-safe commit list.
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

    const limit = clampCandidateCommitLimit(filter.limit);
    const logArgs = [
        'log',
        `--max-count=${VPS_SELF_UPDATE_MAX_CANDIDATE_COMMITS}`,
        '--all',
        `--format=%H${GIT_LOG_FIELD_SEPARATOR}%aI${GIT_LOG_FIELD_SEPARATOR}%an${GIT_LOG_FIELD_SEPARATOR}%ae${GIT_LOG_FIELD_SEPARATOR}%s`,
    ];

    if (filter.authoredAfter) {
        logArgs.push(`--since=${filter.authoredAfter}`);
    }
    if (filter.authoredBefore) {
        logArgs.push(`--until=${filter.authoredBefore}`);
    }

    const logOutput = await runGitInRepository(repositoryDirectory, logArgs);
    if (!logOutput) {
        return [];
    }

    const branchesByCommit = await readRefsByCommit(repositoryDirectory, 'refs/remotes/origin');
    const tagsByCommit = await readRefsByCommit(repositoryDirectory, 'refs/tags');
    const searchText = filter.searchText?.trim().toLowerCase() || '';

    const commits: Array<VpsSelfUpdateCandidateCommit> = [];
    for (const line of logOutput.split('\n')) {
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

        if (searchText && !matchesCandidateCommitSearchText(searchText, commitSha, subject, authorName, branches, tags)) {
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
function clampCandidateCommitLimit(value: number | null | undefined): number {
    const defaultLimit = 200;
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return defaultLimit;
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
function matchesCandidateCommitSearchText(
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
async function readRefsByCommit(
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

/**
 * Builds the placeholder overview used when self-update is unavailable on the host.
 *
 * @param context - Fields shared across every unavailable-overview branch.
 * @returns Browser-safe placeholder overview.
 */
function createUnavailableOverview(context: {
    readonly currentEnvironment: VpsSelfUpdateEnvironmentOption;
    readonly repositoryDirectory: string | null;
    readonly job: VpsSelfUpdateJobSnapshot;
    readonly originRepositoryUrl: string;
    readonly unavailableReason: string;
}): VpsSelfUpdateOverview {
    return {
        isAvailable: false,
        unavailableReason: context.unavailableReason,
        environments: VPS_SELF_UPDATE_ENVIRONMENTS,
        currentEnvironment: context.currentEnvironment,
        repositoryDirectory: context.repositoryDirectory,
        currentCommitSha: null,
        currentCommitShortSha: null,
        currentCommitMessage: null,
        currentCommitDate: null,
        latestRemoteCommitSha: null,
        latestRemoteCommitShortSha: null,
        latestRemoteCommitDate: null,
        commitsBehindCount: null,
        isUpdateAvailable: false,
        originRepositoryUrl: context.originRepositoryUrl,
        isOriginRepositoryDefault: context.originRepositoryUrl === VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
        defaultOriginRepositoryUrl: VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
        job: context.job,
    };
}

/**
 * Converts the persisted shell status into the status that should be shown in the admin overview.
 *
 * A successful self-update may restart the old Agents Server process before the browser sees the final
 * `STATUS=succeeded` write. In that case the stale PID alone is not enough to call the update failed:
 * if the running server is already on the recorded target branch and target commit, the update succeeded.
 *
 * @param job - Persisted self-update job snapshot.
 * @param context - Current repository state observed by the running server.
 * @returns Job snapshot resolved for browser display.
 */
export function resolveVpsSelfUpdateJobForOverview(
    job: VpsSelfUpdateJobSnapshot,
    context: VpsSelfUpdateJobOverviewContext,
): VpsSelfUpdateJobSnapshot {
    const isRestartedSuccessfulUpdate =
        job.status === 'failed' &&
        job.isStale &&
        (!job.errorMessage || job.errorMessage === VPS_SELF_UPDATE_STALE_ERROR_MESSAGE) &&
        job.targetBranch === context.currentEnvironment.branch &&
        job.targetCommitSha !== null &&
        context.currentCommitSha !== null &&
        job.targetCommitSha === context.currentCommitSha;

    if (!isRestartedSuccessfulUpdate) {
        return job;
    }

    return {
        ...job,
        status: 'succeeded',
        currentStep: VPS_SELF_UPDATE_RESTART_SUCCESS_STEP,
        currentCommitSha: context.currentCommitSha,
        errorMessage: null,
        isStale: false,
    };
}

/**
 * Resolves one environment id or branch name to the canonical environment object.
 *
 * Unknown values fall back to the production environment to preserve the historical default.
 *
 * @param value - Raw environment id, branch name, or label.
 * @returns Canonical environment metadata.
 */
export function resolveVpsSelfUpdateEnvironment(value: string | null | undefined): VpsSelfUpdateEnvironmentOption {
    const normalizedValue = value?.trim().toLowerCase() || 'production';
    return (
        VPS_SELF_UPDATE_ENVIRONMENTS.find(
            (environment) =>
                !environment.isCustom &&
                (environment.id === normalizedValue || environment.branch === normalizedValue),
        ) ?? getDefaultVpsSelfUpdateEnvironment()
    );
}

/**
 * Returns the canonical production environment used as the default fallback.
 *
 * @returns Production environment option.
 */
export function getDefaultVpsSelfUpdateEnvironment(): VpsSelfUpdateEnvironmentOption {
    const productionEnvironment = VPS_SELF_UPDATE_ENVIRONMENTS.find((environment) => environment.id === 'production');
    if (!productionEnvironment) {
        throw new Error('Production environment is missing from VPS_SELF_UPDATE_ENVIRONMENTS.');
    }
    return productionEnvironment;
}

/**
 * Returns the canonical custom environment option.
 *
 * @returns Custom environment metadata.
 */
export function getCustomVpsSelfUpdateEnvironment(): VpsSelfUpdateEnvironmentOption {
    const customEnvironment = VPS_SELF_UPDATE_ENVIRONMENTS.find(
        (environment) => environment.id === VPS_SELF_UPDATE_CUSTOM_ENVIRONMENT_ID,
    );
    if (!customEnvironment) {
        throw new Error('Custom environment is missing from VPS_SELF_UPDATE_ENVIRONMENTS.');
    }
    return customEnvironment;
}

/**
 * Resolves the filesystem path of the persisted self-update log file.
 *
 * @returns Absolute log-file path.
 */
export function resolveVpsSelfUpdateLogFilePath(): string {
    return resolve(resolveVpsSelfUpdateStateDirectory(), 'self-update.log');
}

/**
 * Resolves the filesystem path of the persisted self-update status file.
 *
 * @returns Absolute status-file path.
 */
export function resolveVpsSelfUpdateStatusFilePath(): string {
    return resolve(resolveVpsSelfUpdateStateDirectory(), 'self-update.status');
}

/**
 * Encodes one free-form status field into base64 for the shell-owned status file.
 *
 * @param value - Raw string value.
 * @returns Base64-encoded value.
 */
export function encodeStatusField(value: string): string {
    return Buffer.from(value, 'utf-8').toString('base64');
}

/**
 * Reads the currently configured standalone VPS self-update environment from `.env`.
 *
 * @returns Canonical environment metadata.
 */
async function readCurrentVpsSelfUpdateEnvironment(): Promise<VpsSelfUpdateEnvironmentOption> {
    const configuredBranch = await readConfiguredVpsEnvironmentValue('PROMPTBOOK_REPOSITORY_REF');
    return resolveVpsSelfUpdateEnvironment(configuredBranch);
}

/**
 * Reads the configured upstream repository URL from `.env` (falling back to the default upstream).
 *
 * @returns Configured upstream URL.
 */
async function readConfiguredVpsSelfUpdateOriginRepositoryUrl(): Promise<string> {
    const configuredUrl = await readConfiguredVpsEnvironmentValue('PROMPTBOOK_REPOSITORY_URL');
    return configuredUrl?.trim() || VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL;
}

/**
 * Persists the configured upstream repository URL into the standalone VPS `.env` file.
 *
 * Setting the value to the default upstream URL removes any previous override so that the
 * installer falls back to the bundled default the next time it runs.
 *
 * @param originRepositoryUrl - Normalized upstream URL.
 */
async function persistVpsSelfUpdateOriginRepositoryUrl(originRepositoryUrl: string): Promise<void> {
    const envFilePath = resolveVpsEnvironmentFilePath();
    let existingContent = '';
    try {
        existingContent = await readFile(envFilePath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
    }

    const lines = existingContent.split(/\r?\n/u);
    const keyPattern = /^\s*(?:export\s+)?PROMPTBOOK_REPOSITORY_URL=/u;
    const isDefaultUpstream = originRepositoryUrl === VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL;
    const filteredLines = lines.filter((line) => !keyPattern.test(line));

    if (!isDefaultUpstream) {
        filteredLines.push(`PROMPTBOOK_REPOSITORY_URL=${originRepositoryUrl}`);
    }

    const nextContent = `${filteredLines.join('\n').replace(/\n+$/u, '')}\n`;
    await mkdir(dirname(envFilePath), { recursive: true });
    await writeFile(envFilePath, nextContent, { encoding: 'utf-8', mode: 0o600 });
    process.env.PROMPTBOOK_REPOSITORY_URL = isDefaultUpstream ? '' : originRepositoryUrl;
}

/**
 * Resolves the state-directory path used for persistent update logs and status files.
 *
 * @returns Absolute directory path.
 */
function resolveVpsSelfUpdateStateDirectory(): string {
    return resolve(dirname(resolveVpsEnvironmentFilePath()), '.promptbook', 'self-update');
}

/**
 * Reads one persisted update-job snapshot from disk.
 *
 * @returns Parsed job snapshot.
 */
async function readPersistedVpsSelfUpdateJob(): Promise<VpsSelfUpdateJobSnapshot> {
    const statusEntries = await readVpsSelfUpdateStatusFile();
    const targetBranch = statusEntries.get('TARGET_REF') || null;
    const targetEnvironment = resolveVpsSelfUpdateEnvironment(targetBranch);
    const pid = parseNullableInteger(statusEntries.get('PID'));
    const currentStep = decodeStatusField(statusEntries.get('CURRENT_STEP_B64'));
    const errorMessage = decodeStatusField(statusEntries.get('ERROR_MESSAGE_B64'));
    const logFilePath = statusEntries.get('LOG_FILE') || resolveVpsSelfUpdateLogFilePath();
    const rawStatus = statusEntries.get('STATUS');
    const status = isVpsSelfUpdateJobStatus(rawStatus) ? rawStatus : 'idle';
    const isStale = status === 'running' && pid !== null ? !(await isProcessAlive(pid)) : false;

    return {
        status: isStale ? 'failed' : status,
        pid,
        targetBranch,
        targetEnvironment,
        currentStep,
        currentCommitSha: statusEntries.get('CURRENT_COMMIT') || null,
        targetCommitSha: statusEntries.get('TARGET_COMMIT') || null,
        errorMessage: isStale && !errorMessage ? VPS_SELF_UPDATE_STALE_ERROR_MESSAGE : errorMessage,
        startedAt: statusEntries.get('STARTED_AT') || null,
        finishedAt: statusEntries.get('FINISHED_AT') || null,
        isStale,
        logTail: await readLastTextFileChunk(logFilePath),
        logFilePath,
    };
}

/**
 * Reads the persisted shell-owned status file.
 *
 * @returns Parsed key/value entries.
 */
async function readVpsSelfUpdateStatusFile(): Promise<Map<string, string>> {
    const statusFilePath = resolveVpsSelfUpdateStatusFilePath();
    try {
        const rawContent = await readFile(statusFilePath, 'utf-8');
        return new Map(
            rawContent
                .split(/\r?\n/u)
                .map((line) => line.trim())
                .filter((line) => line !== '' && !line.startsWith('#'))
                .map((line) => {
                    const separatorIndex = line.indexOf('=');
                    if (separatorIndex === -1) {
                        return [line, ''] as const;
                    }

                    return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)] as const;
                }),
        );
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return new Map();
        }
        throw error;
    }
}

/**
 * Writes the minimal initial status file before the detached installer takes over.
 *
 * @param entries - Flat status-file fields.
 */
async function writeVpsSelfUpdateStatusFile(entries: Readonly<Record<string, string>>): Promise<void> {
    const statusFilePath = resolveVpsSelfUpdateStatusFilePath();
    await mkdir(dirname(statusFilePath), { recursive: true });
    await writeFile(
        statusFilePath,
        `${Object.entries(entries)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')}\n`,
        'utf-8',
    );
}

/**
 * Reads one configured `.env` value from the standalone VPS installation.
 *
 * @param key - Environment variable name.
 * @returns Stored value or `null`.
 */
async function readConfiguredVpsEnvironmentValue(key: string): Promise<string | null> {
    try {
        const envFileContent = await readFile(resolveVpsEnvironmentFilePath(), 'utf-8');

        for (const line of envFileContent.split(/\r?\n/u)) {
            const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
            if (!match || match[1] !== key) {
                continue;
            }

            const rawValue = match[2]?.trim() || '';
            if (
                (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
                (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ) {
                return rawValue.slice(1, -1);
            }

            return rawValue;
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return process.env[key]?.trim() || null;
        }
        throw error;
    }

    return process.env[key]?.trim() || null;
}

/**
 * Resolves the managed Promptbook repository directory.
 *
 * @returns Absolute path or `null` when it cannot be determined.
 */
async function resolveManagedPromptbookRepositoryDirectory(): Promise<string | null> {
    const configuredDirectory =
        (await readConfiguredVpsEnvironmentValue('PTBK_REPOSITORY_DIR')) ||
        process.env.PTBK_REPOSITORY_DIR?.trim() ||
        '';

    if (configuredDirectory) {
        return resolve(configuredDirectory);
    }

    const fallbackDirectory = resolve(dirname(resolveVpsEnvironmentFilePath()), 'repository');
    try {
        await access(fallbackDirectory, filesystemConstants.R_OK);
        return fallbackDirectory;
    } catch {
        return null;
    }
}

/**
 * Executes one git command in the managed repository.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param args - Arguments passed to `git`.
 * @returns Trimmed stdout or `null` when the command fails.
 */
async function runGitInRepository(repositoryDirectory: string, args: ReadonlyArray<string>): Promise<string | null> {
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
 * Reads the author timestamp of a known commit from the local repository.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @param commitSha - Commit hash to look up.
 * @returns ISO timestamp or `null` when the commit is unknown locally.
 */
async function readCommitDateFromRepository(
    repositoryDirectory: string,
    commitSha: string,
): Promise<string | null> {
    return runGitInRepository(repositoryDirectory, ['log', '-1', '--format=%aI', commitSha]);
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
 */
async function countCommitsBetween(
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
 * Checks whether a detached update process is still alive.
 *
 * @param pid - Candidate process id.
 * @returns `true` when the process exists.
 */
async function isProcessAlive(pid: number): Promise<boolean> {
    if (!Number.isFinite(pid) || pid <= 0) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
}

/**
 * Reads the trailing chunk of a text log file for the browser UI.
 *
 * @param filePath - File to tail.
 * @param byteLimit - Maximum bytes to read from the end of the file.
 * @returns UTF-8 tail text or `null` when missing.
 */
async function readLastTextFileChunk(filePath: string | null, byteLimit = 32768): Promise<string | null> {
    if (!filePath) {
        return null;
    }

    try {
        const fileHandle = await open(filePath, 'r');
        try {
            const fileStats = await stat(filePath);
            const readLength = Math.min(fileStats.size, byteLimit);
            const offset = Math.max(0, fileStats.size - readLength);
            const buffer = Buffer.alloc(readLength);
            const { bytesRead } = await fileHandle.read(buffer, 0, readLength, offset);
            const text = buffer.subarray(0, bytesRead).toString('utf-8');
            return offset > 0 ? text.replace(/^[^\n]*\n/u, '') : text;
        } finally {
            await fileHandle.close();
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/**
 * Decodes one optional base64-encoded status field.
 *
 * @param value - Base64 string or `undefined`.
 * @returns Decoded UTF-8 text or `null`.
 */
function decodeStatusField(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    try {
        return Buffer.from(value, 'base64').toString('utf-8') || null;
    } catch {
        return null;
    }
}

/**
 * Abbreviates a git sha for compact display.
 *
 * @param sha - Full commit sha.
 * @returns Short commit sha or `null`.
 */
function abbreviateCommitSha(sha: string | null): string | null {
    return sha ? sha.slice(0, 7) : null;
}

/**
 * Parses one optional integer field.
 *
 * @param value - Raw string value.
 * @returns Parsed integer or `null`.
 */
function parseNullableInteger(value: string | undefined): number | null {
    if (!value) {
        return null;
    }

    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

/**
 * Type guard for persisted job statuses.
 *
 * @param value - Raw status value.
 * @returns `true` when supported.
 */
function isVpsSelfUpdateJobStatus(value: string | undefined): value is VpsSelfUpdateJobStatus {
    return value === 'idle' || value === 'running' || value === 'succeeded' || value === 'failed';
}
