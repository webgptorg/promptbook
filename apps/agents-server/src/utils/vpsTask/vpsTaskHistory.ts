import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { resolveVpsEnvironmentFilePath } from '../vpsConfiguration';
import type { AdminChatTaskRecord } from '../chatTasksAdmin';
import type { VpsServerSetupTaskHistoryFile } from './vpsTaskTypes';

/**
 * Version of the persisted VPS server setup task-history file.
 *
 * @private constant of `vpsTaskHistory`
 */
const VPS_SERVER_SETUP_TASK_HISTORY_VERSION = 1 as const;

/**
 * In-process write queue preventing overlapping setup-task history updates from dropping rows.
 *
 * @private variable of `vpsTaskHistory`
 */
let vpsServerSetupTaskHistoryWriteQueue: Promise<void> = Promise.resolve();

/**
 * Reads all persisted VPS server setup and certificate-maintenance tasks.
 *
 * @returns Valid task rows, newest first.
 *
 * @private internal utility of Agents Server
 */
export async function readVpsServerSetupTaskHistory(): Promise<Array<AdminChatTaskRecord>> {
    try {
        const rawHistory = await readFile(resolveVpsServerSetupTaskHistoryFilePath(), 'utf-8');
        const parsedHistory = JSON.parse(rawHistory) as unknown;
        if (!isVpsServerSetupTaskHistoryFile(parsedHistory)) {
            return [];
        }

        return parsedHistory.tasks.filter(isVpsServerSetupTaskRecord).map((task) => ({ ...task }));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) {
            return [];
        }

        throw error;
    }
}

/**
 * Adds one newly started VPS server setup task to the persisted history.
 *
 * @param task - Task row to persist.
 * @returns Promise that resolves after the row is written.
 *
 * @private internal utility of Agents Server
 */
export async function appendVpsServerSetupTask(task: AdminChatTaskRecord): Promise<void> {
    await enqueueVpsServerSetupTaskHistoryWrite(async () => {
        const existingTasks = await readVpsServerSetupTaskHistory();
        await writeVpsServerSetupTaskHistory([task, ...existingTasks]);
    });
}

/**
 * Updates the terminal state of one persisted VPS server setup task.
 *
 * @param taskId - Task identifier to update.
 * @param taskUpdate - Terminal fields to apply.
 * @returns Promise that resolves after the row is written.
 *
 * @private internal utility of Agents Server
 */
export async function finishVpsServerSetupTask(
    taskId: string,
    taskUpdate: Pick<
        AdminChatTaskRecord,
        'status' | 'finishedAt' | 'updatedAt' | 'lastErrorSummary' | 'lastErrorDetails'
    >,
): Promise<void> {
    await enqueueVpsServerSetupTaskHistoryWrite(async () => {
        const existingTasks = await readVpsServerSetupTaskHistory();
        const updatedTasks = existingTasks.map((task) => (task.id === taskId ? { ...task, ...taskUpdate } : task));
        await writeVpsServerSetupTaskHistory(updatedTasks);
    });
}

/**
 * Resolves the persisted task-history file used by VPS setup operations.
 *
 * @returns Absolute task-history file path.
 *
 * @private internal utility of Agents Server
 */
export function resolveVpsServerSetupTaskHistoryFilePath(): string {
    return resolve(dirname(resolveVpsEnvironmentFilePath()), '.promptbook', 'vps-server-setup-task-history.json');
}

/**
 * Serializes the VPS server setup task history.
 *
 * @param tasks - Task rows to write.
 * @returns File payload.
 *
 * @private function of `writeVpsServerSetupTaskHistory`
 */
function createVpsServerSetupTaskHistoryFile(tasks: ReadonlyArray<AdminChatTaskRecord>): VpsServerSetupTaskHistoryFile {
    return {
        version: VPS_SERVER_SETUP_TASK_HISTORY_VERSION,
        tasks,
    };
}

/**
 * Writes the complete VPS server setup task history.
 *
 * @param tasks - Task rows to write.
 * @returns Promise that resolves after the file is written.
 *
 * @private function of `appendVpsServerSetupTask`
 */
async function writeVpsServerSetupTaskHistory(tasks: ReadonlyArray<AdminChatTaskRecord>): Promise<void> {
    const historyFilePath = resolveVpsServerSetupTaskHistoryFilePath();
    await mkdir(dirname(historyFilePath), { recursive: true });
    await writeFile(
        historyFilePath,
        `${JSON.stringify(createVpsServerSetupTaskHistoryFile(tasks), null, 2)}\n`,
        'utf-8',
    );
}

/**
 * Serializes file updates so concurrent setup operations preserve every task row.
 *
 * @param operation - One history read-modify-write operation.
 * @returns Promise returned by the queued operation.
 *
 * @private function of `appendVpsServerSetupTask`
 */
function enqueueVpsServerSetupTaskHistoryWrite(operation: () => Promise<void>): Promise<void> {
    const queuedOperation = vpsServerSetupTaskHistoryWriteQueue.then(operation, operation);
    vpsServerSetupTaskHistoryWriteQueue = queuedOperation.catch(() => undefined);
    return queuedOperation;
}

/**
 * Checks whether parsed JSON has the expected task-history envelope.
 *
 * @param value - Parsed JSON value.
 * @returns `true` when the value has the expected version and task array.
 *
 * @private function of `readVpsServerSetupTaskHistory`
 */
function isVpsServerSetupTaskHistoryFile(value: unknown): value is VpsServerSetupTaskHistoryFile {
    return (
        typeof value === 'object' &&
        value !== null &&
        'version' in value &&
        value.version === VPS_SERVER_SETUP_TASK_HISTORY_VERSION &&
        'tasks' in value &&
        Array.isArray(value.tasks)
    );
}

/**
 * Checks whether one parsed value is a safe VPS setup task row.
 *
 * @param value - Parsed JSON value.
 * @returns `true` when the value contains the fields needed by the task manager.
 *
 * @private function of `readVpsServerSetupTaskHistory`
 */
function isVpsServerSetupTaskRecord(value: unknown): value is AdminChatTaskRecord {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const task = value as Partial<AdminChatTaskRecord>;
    return (
        typeof task.id === 'string' &&
        task.kind === 'VPS_SERVER_SETUP' &&
        typeof task.status === 'string' &&
        typeof task.createdAt === 'string' &&
        typeof task.queuedAt === 'string' &&
        typeof task.updatedAt === 'string' &&
        typeof task.attemptCount === 'number' &&
        typeof task.retryCount === 'number' &&
        typeof task.userId === 'number' &&
        typeof task.agentPermanentId === 'string' &&
        typeof task.agentName === 'string' &&
        typeof task.chatId === 'string'
    );
}
