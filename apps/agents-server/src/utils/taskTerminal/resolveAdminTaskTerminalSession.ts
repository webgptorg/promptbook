import { spaceTrim } from 'spacetrim';
import { getUserChatJobById } from '../userChat/getUserChatJobById';
import { getUserChatTimeoutById } from '../userChatTimeout/userChatTimeoutStore/getUserChatTimeoutById';
import { VPS_SELF_UPDATE_ADMIN_CHAT_TASK_ID } from '../getAdminChatTasksResponse/mapVpsSelfUpdateJobToAdminChatTask';
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
 * How often the standalone VPS self-update installer log file is polled while streaming.
 */
const VPS_SELF_UPDATE_TERMINAL_POLL_INTERVAL_MS = 2_000;

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
        subscribe: createVpsSelfUpdateLogFileSubscribe({ session, jobIdentity }),
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
 * Creates a subscribe function that live-tails the persisted self-update installer log file.
 *
 * The detached installer process cannot push events into this server process, so the log
 * file is polled and only newly appended text is forwarded to the subscriber.
 *
 * @param options - Initial session snapshot and the identity of the streamed run.
 * @returns Subscribe function compatible with the shared admin terminal SSE helper.
 */
function createVpsSelfUpdateLogFileSubscribe(options: {
    readonly session: TaskTerminalLogSnapshot;
    readonly jobIdentity: string;
}): AdminTaskTerminalSubscribe {
    return (taskId, subscriber) => {
        let knownOutput = options.session.output;
        let isStopped = false;
        let isPollInFlight = false;

        const pollInterval = setInterval(async () => {
            if (isStopped || isPollInFlight) {
                return;
            }

            isPollInFlight = true;
            try {
                const [logFileContent, latestJob] = await Promise.all([
                    readVpsSelfUpdateLogFileContent(),
                    readVpsSelfUpdateJobSnapshot(),
                ]);
                const isStillLatestJob = resolveVpsSelfUpdateJobIdentity(latestJob) === options.jobIdentity;
                const output = isStillLatestJob ? logFileContent || '' : knownOutput;

                if (isStopped) {
                    return;
                }

                if (output.length > knownOutput.length && output.startsWith(knownOutput)) {
                    subscriber.onOutput({
                        type: 'output',
                        chunk: output.slice(knownOutput.length),
                    });
                    knownOutput = output;
                }

                if (!isStillLatestJob || latestJob.status !== 'running') {
                    subscriber.onExit({
                        type: 'exit',
                        snapshot: {
                            ...options.session,
                            isRunning: false,
                            output: knownOutput,
                            finishedAt: latestJob.finishedAt || new Date().toISOString(),
                            exitCode: resolveVpsSelfUpdateExitCode(latestJob.status) ?? 1,
                        },
                    });
                }
            } catch {
                // Note: Ignore transient log-file read failures and retry on the next poll
            } finally {
                isPollInFlight = false;
            }
        }, VPS_SELF_UPDATE_TERMINAL_POLL_INTERVAL_MS);
        pollInterval.unref?.();

        return () => {
            isStopped = true;
            clearInterval(pollInterval);
        };
    };
}
