import { readFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { buildAgentMessageRuntimeLogPathFromFileName } from '../../../../../src/utils/agent-message-runtime/agentMessageRuntimePaths';
import { getUserChatJobById } from '../userChat/getUserChatJobById';
import { getUserChatTimeoutById } from '../userChatTimeout/userChatTimeoutStore/getUserChatTimeoutById';
import { VPS_SELF_UPDATE_ADMIN_CHAT_TASK_ID } from '../getAdminChatTasksResponse/mapVpsSelfUpdateJobToAdminChatTask';
import { getLocalUserChatJobMetadata } from '../localChatRunner/LocalUserChatJobMetadata';
import { resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import { listPagePreviewBrowserAdminTasks } from '../pagePreviewBrowserSessions';
import {
    readVpsSelfUpdateJobSnapshot,
    readVpsSelfUpdateJobTaskSnapshots,
    readVpsSelfUpdateLogFileContent,
} from '../vpsSelfUpdate';
import type { VpsSelfUpdateJobSnapshot } from '../vpsSelfUpdate';
import { resolveVpsSelfUpdateJobIdentity } from '../vpsSelfUpdate/vpsSelfUpdateJobIdentity';
import {
    getTaskTerminalLogSnapshot,
    subscribeToTaskTerminalLog,
    type TaskTerminalLogSnapshot,
    type TaskTerminalLogSubscriber,
} from './taskTerminalLog';

/**
 * Prefix used by synthetic standalone VPS self-update task ids.
 */
const VPS_SELF_UPDATE_TASK_ID_PREFIX = `${VPS_SELF_UPDATE_ADMIN_CHAT_TASK_ID}:`;

/**
 * Prefix used by ephemeral browser-preview task ids.
 */
const PAGE_PREVIEW_TASK_ID_PREFIX = 'page-preview-';

/**
 * How often a task-owned terminal log file is polled while streaming.
 */
const TASK_TERMINAL_LOG_FILE_POLL_INTERVAL_MS = 2_000;

/**
 * Terminal subscribe function compatible with the shared admin terminal SSE helper.
 */
type AdminTaskTerminalSubscribe = (taskId: string, subscriber: TaskTerminalLogSubscriber) => (() => void) | null;

/**
 * Resolved terminal view of one admin task.
 */
export type AdminTaskTerminalResolution = {
    /**
     * Browser-safe terminal session snapshot for the task.
     */
    readonly session: TaskTerminalLogSnapshot;

    /**
     * Live event subscription used by the SSE stream.
     */
    readonly subscribe: AdminTaskTerminalSubscribe;
};

/**
 * Resolves the read-only terminal session of one admin task-manager task.
 *
 * Durable chat jobs, chat timeouts, and browser previews use the in-memory task terminal
 * log captured while the task is processed in this server process. Standalone VPS
 * self-update tasks are backed by the persisted installer log file instead, because the
 * updater runs as a detached process that survives server restarts.
 *
 * @param taskId - Task identifier used by the admin task manager.
 * @returns Terminal resolution or `null` when the task does not exist.
 */
export async function resolveAdminTaskTerminalSession(taskId: string): Promise<AdminTaskTerminalResolution | null> {
    if (taskId.startsWith(VPS_SELF_UPDATE_TASK_ID_PREFIX)) {
        return await resolveVpsSelfUpdateTaskTerminalSession(taskId);
    }

    if (taskId.startsWith(PAGE_PREVIEW_TASK_ID_PREFIX)) {
        return resolvePagePreviewTaskTerminalSession(taskId);
    }

    return await resolveDurableTaskTerminalSession(taskId);
}

/**
 * Resolves the terminal session of one durable chat job or chat timeout.
 *
 * @param taskId - Durable job or timeout identifier.
 * @returns Terminal resolution or `null` when no durable task exists for the id.
 */
async function resolveDurableTaskTerminalSession(taskId: string): Promise<AdminTaskTerminalResolution | null> {
    const job = await getUserChatJobById(taskId);
    const timeout = job ? null : await getUserChatTimeoutById(taskId);
    const task = job || timeout;

    if (!task) {
        return null;
    }

    const isRunning = task.status === 'QUEUED' || task.status === 'RUNNING';

    if (job) {
        const localRunnerMetadata = getLocalUserChatJobMetadata(job);

        if (localRunnerMetadata) {
            return await resolveLocalUserChatJobTerminalSession({
                taskId,
                isRunning,
                startedAt: task.startedAt || task.queuedAt || task.createdAt,
                finishedAt: task.completedAt,
                exitCode: resolveFinishedTaskExitCode(task.status),
                agentDirectoryName: localRunnerMetadata.agentDirectoryName,
                fileName: localRunnerMetadata.fileName,
            });
        }
    }

    return {
        session: createInMemoryTaskTerminalSession({
            taskId,
            isRunning,
            startedAt: task.startedAt || task.queuedAt || task.createdAt,
            finishedAt: task.completedAt,
            exitCode: resolveFinishedTaskExitCode(task.status),
        }),
        subscribe: subscribeToTaskTerminalLog,
    };
}

/**
 * Resolves the terminal session backed by the local coding-harness runtime log file.
 *
 * @param options - Durable job lifecycle fields and local runner metadata.
 * @returns Terminal resolution backed by the per-job harness log file.
 */
async function resolveLocalUserChatJobTerminalSession(options: {
    readonly taskId: string;
    readonly isRunning: boolean;
    readonly startedAt: string;
    readonly finishedAt: string | null;
    readonly exitCode: number | null;
    readonly agentDirectoryName: string;
    readonly fileName: string;
}): Promise<AdminTaskTerminalResolution> {
    const runtimeLogPath = resolveLocalUserChatJobRuntimeLogPath({
        agentDirectoryName: options.agentDirectoryName,
        fileName: options.fileName,
    });
    const terminalLogSnapshot = getTaskTerminalLogSnapshot(options.taskId);
    const output = (await readOptionalTextFile(runtimeLogPath)) || terminalLogSnapshot?.output || '';
    const session: TaskTerminalLogSnapshot = {
        id: options.taskId,
        isRunning: options.isRunning,
        output,
        startedAt: options.startedAt,
        finishedAt: options.finishedAt,
        exitCode: options.exitCode,
        signal: null,
    };

    return {
        session,
        subscribe: createPolledTaskTerminalLogFileSubscribe({
            session,
            readOutput: () => readOptionalTextFile(runtimeLogPath),
            resolveExitSnapshot: (knownOutput) => resolveDurableTaskExitSnapshot(options.taskId, session, knownOutput),
        }),
    };
}

/**
 * Resolves the terminal session of one ephemeral browser-preview stream.
 *
 * @param taskId - Browser-preview session identifier.
 * @returns Terminal resolution or `null` when the preview neither runs nor left a retained log.
 */
function resolvePagePreviewTaskTerminalSession(taskId: string): AdminTaskTerminalResolution | null {
    const activePreviewTask = listPagePreviewBrowserAdminTasks().find((task) => task.id === taskId) || null;
    const terminalLogSnapshot = getTaskTerminalLogSnapshot(taskId);

    if (!activePreviewTask && !terminalLogSnapshot) {
        return null;
    }

    return {
        session: createInMemoryTaskTerminalSession({
            taskId,
            isRunning: activePreviewTask !== null,
            startedAt: activePreviewTask?.startedAt || terminalLogSnapshot?.startedAt || new Date().toISOString(),
            finishedAt: activePreviewTask ? null : terminalLogSnapshot?.finishedAt || null,
            exitCode: activePreviewTask ? null : terminalLogSnapshot?.exitCode ?? null,
        }),
        subscribe: subscribeToTaskTerminalLog,
    };
}

/**
 * Builds one terminal session backed by the in-memory task terminal log.
 *
 * The task lifecycle fields come from the authoritative task record while the buffered
 * output comes from the console capture of this server process.
 *
 * @param options - Authoritative task lifecycle fields.
 * @returns Browser-safe terminal session snapshot.
 */
function createInMemoryTaskTerminalSession(options: {
    readonly taskId: string;
    readonly isRunning: boolean;
    readonly startedAt: string;
    readonly finishedAt: string | null;
    readonly exitCode: number | null;
}): TaskTerminalLogSnapshot {
    const terminalLogSnapshot = getTaskTerminalLogSnapshot(options.taskId);

    return {
        id: options.taskId,
        isRunning: options.isRunning,
        output: terminalLogSnapshot?.output || '',
        startedAt: options.startedAt,
        finishedAt: options.finishedAt,
        exitCode: options.exitCode,
        signal: null,
    };
}

/**
 * Builds the runtime log path created by the foreground local coding harness.
 *
 * @param options - Local runner folder and queued message filename.
 * @returns Absolute path to the live harness runtime log file.
 */
function resolveLocalUserChatJobRuntimeLogPath(options: {
    readonly agentDirectoryName: string;
    readonly fileName: string;
}): string {
    return buildAgentMessageRuntimeLogPathFromFileName(
        join(resolveLocalAgentRootPath(), options.agentDirectoryName),
        options.fileName,
    );
}

/**
 * Resolves a durable chat-task exit snapshot while a file-backed terminal stream is open.
 *
 * @param taskId - Durable chat job identifier.
 * @param session - Initial terminal session snapshot.
 * @param knownOutput - Latest terminal output already sent to the browser.
 * @returns Exit snapshot or `null` while the job is still active.
 */
async function resolveDurableTaskExitSnapshot(
    taskId: string,
    session: TaskTerminalLogSnapshot,
    knownOutput: string,
): Promise<TaskTerminalLogSnapshot | null> {
    const latestJob = await getUserChatJobById(taskId);

    if (!latestJob) {
        return {
            ...session,
            isRunning: false,
            output: knownOutput,
            finishedAt: new Date().toISOString(),
            exitCode: 1,
        };
    }

    if (latestJob.status === 'QUEUED' || latestJob.status === 'RUNNING') {
        return null;
    }

    return {
        ...session,
        isRunning: false,
        output: knownOutput,
        finishedAt: latestJob.completedAt || new Date().toISOString(),
        exitCode: resolveFinishedTaskExitCode(latestJob.status) ?? 1,
    };
}

/**
 * Maps one finished durable-task status to the synthetic terminal exit code.
 *
 * @param status - Durable task status.
 * @returns `0` on success, `1` on failure or cancellation, `null` while unfinished.
 */
function resolveFinishedTaskExitCode(status: string): number | null {
    if (status === 'COMPLETED') {
        return 0;
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
        return 1;
    }

    return null;
}

/**
 * Resolves the terminal session of one standalone VPS self-update task.
 *
 * @param taskId - Synthetic `vps-self-update:<identity>` task identifier.
 * @returns Terminal resolution or `null` when no matching self-update run is known.
 */
async function resolveVpsSelfUpdateTaskTerminalSession(taskId: string): Promise<AdminTaskTerminalResolution | null> {
    const jobIdentity = taskId.slice(VPS_SELF_UPDATE_TASK_ID_PREFIX.length);
    const jobSnapshots = await readVpsSelfUpdateJobTaskSnapshots();
    const job = jobSnapshots.find((candidate) => resolveVpsSelfUpdateJobIdentity(candidate) === jobIdentity) || null;

    if (!job) {
        return null;
    }

    const latestJob = await readVpsSelfUpdateJobSnapshot();
    const isLatestJob = resolveVpsSelfUpdateJobIdentity(latestJob) === jobIdentity;
    const output = isLatestJob
        ? (await readVpsSelfUpdateLogFileContent()) || ''
        : createArchivedVpsSelfUpdateLogPlaceholder(job);
    const isRunning = isLatestJob && job.status === 'running';

    const session: TaskTerminalLogSnapshot = {
        id: taskId,
        isRunning,
        output,
        startedAt: job.startedAt || new Date().toISOString(),
        finishedAt: job.finishedAt,
        exitCode: resolveVpsSelfUpdateExitCode(job.status),
        signal: null,
    };

    return {
        session,
        subscribe: createPolledTaskTerminalLogFileSubscribe({
            session,
            readOutput: async () => {
                const latestJobSnapshot = await readVpsSelfUpdateJobSnapshot();
                const isStillLatestJob = resolveVpsSelfUpdateJobIdentity(latestJobSnapshot) === jobIdentity;

                return isStillLatestJob ? (await readVpsSelfUpdateLogFileContent()) || '' : null;
            },
            resolveExitSnapshot: async (knownOutput) => {
                const latestJobSnapshot = await readVpsSelfUpdateJobSnapshot();
                const isStillLatestJob = resolveVpsSelfUpdateJobIdentity(latestJobSnapshot) === jobIdentity;

                if (isStillLatestJob && latestJobSnapshot.status === 'running') {
                    return null;
                }

                return {
                    ...session,
                    isRunning: false,
                    output: knownOutput,
                    finishedAt: latestJobSnapshot.finishedAt || new Date().toISOString(),
                    exitCode: resolveVpsSelfUpdateExitCode(latestJobSnapshot.status) ?? 1,
                };
            },
        }),
    };
}

/**
 * Explains why an archived self-update run has no full installer log anymore.
 *
 * @param job - Archived self-update job snapshot.
 * @returns Placeholder terminal text.
 */
function createArchivedVpsSelfUpdateLogPlaceholder(job: VpsSelfUpdateJobSnapshot): string {
    return (
        spaceTrim(`
            The full installer log of this self-update run is no longer available.
            Only the log of the most recent self-update run is kept on disk${
                job.logFilePath ? ` at ${job.logFilePath}` : ''
            }.
        `) + '\n'
    );
}

/**
 * Maps one self-update status to the synthetic terminal exit code.
 *
 * @param status - Persisted self-update status.
 * @returns `0` on success, `1` on failure, `null` while running.
 */
function resolveVpsSelfUpdateExitCode(status: VpsSelfUpdateJobSnapshot['status']): number | null {
    if (status === 'succeeded') {
        return 0;
    }

    if (status === 'failed') {
        return 1;
    }

    return null;
}

/**
 * Creates a subscribe function that live-tails a task-owned terminal log file.
 *
 * @param options - Initial session snapshot, file reader, and lifecycle resolver.
 * @returns Subscribe function compatible with the shared admin terminal SSE helper.
 */
function createPolledTaskTerminalLogFileSubscribe(options: {
    readonly session: TaskTerminalLogSnapshot;
    readonly readOutput: () => Promise<string | null>;
    readonly resolveExitSnapshot: (knownOutput: string) => Promise<TaskTerminalLogSnapshot | null>;
}): AdminTaskTerminalSubscribe {
    return (_taskId, subscriber) => {
        let knownOutput = options.session.output;
        let isStopped = false;
        let isPollInFlight = false;

        const pollInterval = setInterval(async () => {
            if (isStopped || isPollInFlight) {
                return;
            }

            isPollInFlight = true;
            try {
                const output = await options.readOutput();

                if (isStopped) {
                    return;
                }

                if (output !== null) {
                    const outputChunk = resolveAppendedTaskTerminalLogFileChunk(knownOutput, output);

                    if (outputChunk !== null) {
                        subscriber.onOutput({
                            type: 'output',
                            chunk: outputChunk,
                        });
                    }

                    knownOutput = output;
                }

                const exitSnapshot = await options.resolveExitSnapshot(knownOutput);

                if (isStopped || !exitSnapshot) {
                    return;
                }

                isStopped = true;
                clearInterval(pollInterval);
                subscriber.onExit({
                    type: 'exit',
                    snapshot: exitSnapshot,
                });
            } catch {
                // Note: Ignore transient log-file read failures and retry on the next poll
            } finally {
                isPollInFlight = false;
            }
        }, TASK_TERMINAL_LOG_FILE_POLL_INTERVAL_MS);
        pollInterval.unref?.();

        return () => {
            isStopped = true;
            clearInterval(pollInterval);
        };
    };
}

/**
 * Resolves the output chunk appended since the last file poll.
 *
 * @param knownOutput - Output already sent to the browser.
 * @param nextOutput - Latest complete log file content.
 * @returns Appended chunk, full replacement content after truncation, or `null` when unchanged.
 */
function resolveAppendedTaskTerminalLogFileChunk(knownOutput: string, nextOutput: string): string | null {
    if (nextOutput === knownOutput) {
        return null;
    }

    if (nextOutput.startsWith(knownOutput)) {
        return nextOutput.slice(knownOutput.length);
    }

    return nextOutput;
}

/**
 * Reads one optional terminal log file.
 *
 * @param filePath - Absolute log file path.
 * @returns File content or `null` when the log file does not exist yet.
 */
async function readOptionalTextFile(filePath: string): Promise<string | null> {
    try {
        return await readFile(filePath, 'utf-8');
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Returns true when one filesystem error indicates a missing path.
 *
 * @param error - Unknown filesystem error.
 * @returns Whether the error means the file path is absent.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
