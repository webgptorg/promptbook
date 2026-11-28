import { loadAgentNamesByPermanentId, loadUsernamesByUserId } from '../../adminEntityLookups';
import { provideUserChatJobTable } from '../../userChat/provideUserChatJobTable';
import type { UserChatJobStatus } from '../../userChat/UserChatJobRecord';
import { provideUserChatTimeoutTable } from '../../userChatTimeout/userChatTimeoutStore/provideUserChatTimeoutTable';

/**
 * SQLite-backed job row used by the admin task-manager fallback.
 *
 * @private type of `getAdminChatTasks`
 */
export type AdminChatTaskJobRow = {
    id: string;
    createdAt: string;
    queuedAt: string;
    startedAt: string | null;
    updatedAt: string;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    lastHeartbeatAt: string | null;
    leaseExpiresAt: string | null;
    attemptCount: number;
    failureReason: string | null;
    failureDetails?: string | null;
    userId: number;
    agentPermanentId: string;
    chatId: string;
    status: UserChatJobStatus;
    parameters?: unknown;
};

/**
 * SQLite-backed timeout row used by the admin task-manager fallback.
 *
 * @private type of `getAdminChatTasks`
 */
export type AdminChatTaskTimeoutRow = {
    id: string;
    createdAt: string;
    queuedAt: string;
    startedAt: string | null;
    updatedAt: string;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    pausedAt: string | null;
    leaseExpiresAt: string | null;
    recurrenceIntervalMs: number | string | null;
    attemptCount: number;
    failureReason: string | null;
    userId: number;
    agentPermanentId: string;
    chatId: string;
    status: UserChatJobStatus;
};

/**
 * Raw admin task-manager rows and lookup maps loaded through the Supabase-shaped adapters used by SQLite mode.
 *
 * @private type of `getAdminChatTasks`
 */
export type AdminChatTaskFallbackData = {
    jobRows: Array<AdminChatTaskJobRow>;
    timeoutRows: Array<AdminChatTaskTimeoutRow>;
    usernamesById: ReadonlyMap<number, string>;
    agentNamesByPermanentId: ReadonlyMap<string, string | null>;
};

/**
 * Loads the durable chat-job and timeout rows plus their user and agent lookup maps for SQLite mode.
 *
 * @private function of `getAdminChatTasks`
 */
export async function loadAdminChatTaskFallbackData(): Promise<AdminChatTaskFallbackData> {
    const [jobRows, timeoutRows] = await Promise.all([loadAdminChatTaskJobRows(), loadAdminChatTaskTimeoutRows()]);
    const allUserIds = [...new Set([...jobRows, ...timeoutRows].map((task) => task.userId))];
    const allAgentPermanentIds = [
        ...new Set([...jobRows, ...timeoutRows].map((task) => task.agentPermanentId).filter(Boolean)),
    ];
    const [usernamesById, agentNamesByPermanentId] = await Promise.all([
        loadUsernamesByUserId(allUserIds),
        loadAgentNamesByPermanentId(allAgentPermanentIds),
    ]);

    return { jobRows, timeoutRows, usernamesById, agentNamesByPermanentId };
}

/**
 * Loads lightweight durable chat-job rows for SQLite mode.
 *
 * @private function of `getAdminChatTasks`
 */
async function loadAdminChatTaskJobRows(): Promise<Array<AdminChatTaskJobRow>> {
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable.select(
        'id,createdAt,queuedAt,startedAt,updatedAt,completedAt,cancelRequestedAt,lastHeartbeatAt,leaseExpiresAt,attemptCount,failureReason,failureDetails,userId,agentPermanentId,chatId,status,parameters',
    );

    if (error) {
        throw new Error(`Failed to list admin user chat jobs: ${error.message}`);
    }

    return (data || []) as unknown as Array<AdminChatTaskJobRow>;
}

/**
 * Loads lightweight durable timeout rows for SQLite mode.
 *
 * @private function of `getAdminChatTasks`
 */
async function loadAdminChatTaskTimeoutRows(): Promise<Array<AdminChatTaskTimeoutRow>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable.select(
        'id,createdAt,queuedAt,startedAt,updatedAt,completedAt,cancelRequestedAt,pausedAt,leaseExpiresAt,recurrenceIntervalMs,attemptCount,failureReason,userId,agentPermanentId,chatId,status',
    );

    if (error) {
        throw new Error(`Failed to list admin user chat timeouts: ${error.message}`);
    }

    return (data || []) as unknown as Array<AdminChatTaskTimeoutRow>;
}
