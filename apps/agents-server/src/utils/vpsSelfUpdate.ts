import { execFile, spawn } from 'child_process';
import { constants as filesystemConstants } from 'fs';
import { access, mkdir, open, readFile, stat, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { promisify } from 'util';
import { NotAllowed } from '../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';
import { createVpsInstallerCommandEnvironment, resolveVpsEnvironmentFilePath, resolveVpsInstallerScriptPath } from './vpsConfiguration';

const execFileAsync = promisify(execFile);

/**
 * Supported standalone VPS update environments.
 */
export const VPS_SELF_UPDATE_ENVIRONMENTS = [
    {
        id: 'production',
        branch: 'production',
        label: 'Production',
        description: 'Recommended stable deployment branch for standalone servers.',
    },
    {
        id: 'main',
        branch: 'main',
        label: 'Live',
        description: 'Tracks the latest commit from the main development branch.',
    },
    {
        id: 'preview',
        branch: 'preview',
        label: 'Preview',
        description: 'Follows the preview branch before changes reach production.',
    },
    {
        id: 'lts',
        branch: 'lts',
        label: 'LTS',
        description: 'Keeps the server on the long-term-support branch.',
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
     * Latest remote commit on the selected branch.
     */
    readonly latestRemoteCommitSha: string | null;
    /**
     * Short latest remote commit.
     */
    readonly latestRemoteCommitShortSha: string | null;
    /**
     * Whether the remote branch contains a newer commit than the deployed checkout.
     */
    readonly isUpdateAvailable: boolean;
    /**
     * Latest persisted update-job state.
     */
    readonly job: VpsSelfUpdateJobSnapshot;
};

/**
 * Starts one detached VPS self-update run for the selected environment.
 *
 * The actual update is executed by `other/vps/install.sh self-update`, while this
 * helper writes the initial persisted state and detaches the background process so
 * the triggering HTTP request can finish before pm2 restarts the server.
 *
 * @param targetEnvironmentId - Deployment environment selected by the super admin.
 * @returns Fresh overview including the running background job.
 */
export async function startVpsSelfUpdate(targetEnvironmentId: string): Promise<VpsSelfUpdateOverview> {
    if (process.platform !== 'linux') {
        throw new NotAllowed(
            spaceTrim(`
                Self-update is available only on the standalone Linux VPS deployment.
            `),
        );
    }

    const targetEnvironment = resolveVpsSelfUpdateEnvironment(targetEnvironmentId);
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
        const child = spawn('bash', [scriptPath, 'self-update', '--branch', targetEnvironment.branch], {
            detached: true,
            stdio: ['ignore', logHandle.fd, logHandle.fd],
            env: {
                ...createVpsInstallerCommandEnvironment(),
                PTBK_SELF_UPDATE_STATUS_FILE: statusFilePath,
                PTBK_SELF_UPDATE_LOG_FILE: logFilePath,
                PTBK_TARGET_REPOSITORY_REF: targetEnvironment.branch,
            },
        });

        await writeVpsSelfUpdateStatusFile({
            STATUS: 'running',
            PID: String(child.pid ?? ''),
            TARGET_REF: targetEnvironment.branch,
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
 * Reads the current standalone VPS self-update overview.
 *
 * @returns Browser-safe update summary for the super-admin UI.
 */
export async function readVpsSelfUpdateOverview(): Promise<VpsSelfUpdateOverview> {
    const currentEnvironment = await readCurrentVpsSelfUpdateEnvironment();
    const repositoryDirectory = await resolveManagedPromptbookRepositoryDirectory();
    const scriptPath = await resolveVpsInstallerScriptPath();
    const job = await readPersistedVpsSelfUpdateJob();

    if (process.platform !== 'linux') {
        return {
            isAvailable: false,
            unavailableReason: 'Self-update is available only on the standalone Linux VPS deployment.',
            environments: VPS_SELF_UPDATE_ENVIRONMENTS,
            currentEnvironment,
            repositoryDirectory,
            currentCommitSha: null,
            currentCommitShortSha: null,
            currentCommitMessage: null,
            latestRemoteCommitSha: null,
            latestRemoteCommitShortSha: null,
            isUpdateAvailable: false,
            job,
        };
    }

    if (!scriptPath) {
        return {
            isAvailable: false,
            unavailableReason: 'The shared VPS installer script could not be found on this server.',
            environments: VPS_SELF_UPDATE_ENVIRONMENTS,
            currentEnvironment,
            repositoryDirectory,
            currentCommitSha: null,
            currentCommitShortSha: null,
            currentCommitMessage: null,
            latestRemoteCommitSha: null,
            latestRemoteCommitShortSha: null,
            isUpdateAvailable: false,
            job,
        };
    }

    if (!repositoryDirectory) {
        return {
            isAvailable: false,
            unavailableReason: 'The managed Promptbook repository directory is not configured on this server.',
            environments: VPS_SELF_UPDATE_ENVIRONMENTS,
            currentEnvironment,
            repositoryDirectory: null,
            currentCommitSha: null,
            currentCommitShortSha: null,
            currentCommitMessage: null,
            latestRemoteCommitSha: null,
            latestRemoteCommitShortSha: null,
            isUpdateAvailable: false,
            job,
        };
    }

    const [currentCommitSha, currentCommitMessage, latestRemoteCommitSha] = await Promise.all([
        runGitInRepository(repositoryDirectory, ['rev-parse', 'HEAD']),
        runGitInRepository(repositoryDirectory, ['log', '-1', '--format=%s']),
        readRemoteCommitSha(repositoryDirectory, currentEnvironment.branch),
    ]);

    return {
        isAvailable: Boolean(currentCommitSha),
        unavailableReason: currentCommitSha ? null : 'The managed Promptbook repository checkout is not available.',
        environments: VPS_SELF_UPDATE_ENVIRONMENTS,
        currentEnvironment,
        repositoryDirectory,
        currentCommitSha,
        currentCommitShortSha: abbreviateCommitSha(currentCommitSha),
        currentCommitMessage,
        latestRemoteCommitSha,
        latestRemoteCommitShortSha: abbreviateCommitSha(latestRemoteCommitSha),
        isUpdateAvailable: Boolean(currentCommitSha && latestRemoteCommitSha && currentCommitSha !== latestRemoteCommitSha),
        job,
    };
}

/**
 * Resolves one environment id or branch name to the canonical environment object.
 *
 * @param value - Raw environment id, branch name, or label.
 * @returns Canonical environment metadata.
 */
export function resolveVpsSelfUpdateEnvironment(value: string | null | undefined): VpsSelfUpdateEnvironmentOption {
    const normalizedValue = value?.trim().toLowerCase() || 'production';
    return (
        VPS_SELF_UPDATE_ENVIRONMENTS.find(
            (environment) => environment.id === normalizedValue || environment.branch === normalizedValue,
        ) ?? VPS_SELF_UPDATE_ENVIRONMENTS[0]
    );
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
        errorMessage:
            isStale && !errorMessage
                ? 'The previous background update process stopped unexpectedly before writing its final status.'
                : errorMessage,
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
        (await readConfiguredVpsEnvironmentValue('PTBK_REPOSITORY_DIR')) || process.env.PTBK_REPOSITORY_DIR?.trim() || '';

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
 * @returns Remote commit sha or `null`.
 */
async function readRemoteCommitSha(repositoryDirectory: string, branch: string): Promise<string | null> {
    const output = await runGitInRepository(repositoryDirectory, ['ls-remote', 'origin', `refs/heads/${branch}`]);
    return output?.split(/\s+/u)[0] || null;
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
