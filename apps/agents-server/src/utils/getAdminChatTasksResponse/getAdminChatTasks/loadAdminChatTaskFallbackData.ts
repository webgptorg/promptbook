import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';
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
 * Minimal user lookup row needed by the admin task-manager fallback.
 *
 * @private type of `getAdminChatTasks`
 */
type AdminChatTaskUserLookupRow = Pick<AgentsServerDatabase['public']['Tables']['User']['Row'], 'id' | 'username'>;

/**
 * Minimal agent lookup row needed by the admin task-manager fallback.
 *
 * @private type of `getAdminChatTasks`
 */
type AdminChatTaskAgentLookupRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'permanentId' | 'agentName'
>;

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
        loadAdminChatTaskUsernames(allUserIds),
        loadAdminChatTaskAgentNames(allAgentPermanentIds),
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
        'id,createdAt,queuedAt,startedAt,updatedAt,completedAt,cancelRequestedAt,lastHeartbeatAt,leaseExpiresAt,attemptCount,failureReason,failureDetails,userId,agentPermanentId,chatId,status',
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

/**
 * Loads usernames keyed by user id for admin task rendering and search.
 *
 * @private function of `getAdminChatTasks`
 */
async function loadAdminChatTaskUsernames(userIds: ReadonlyArray<number>): Promise<Map<number, string>> {
    if (userIds.length === 0) {
        return new Map();
    }

    const supabase = $provideSupabaseForServer();
    const userTable = await $getTableName('User');
    const { data, error } = await supabase.from(userTable).select('id,username').in('id', [...new Set(userIds)]);

    if (error) {
        throw new Error(`Failed to load admin task-manager users: ${error.message}`);
    }

    return new Map(
        ((data || []) as Array<AdminChatTaskUserLookupRow>).map((userRow) => [userRow.id, userRow.username] as const),
    );
}

/**
 * Loads agent names keyed by permanent id for admin task rendering and search.
 *
 * @private function of `getAdminChatTasks`
 */
async function loadAdminChatTaskAgentNames(
    agentPermanentIds: ReadonlyArray<string>,
): Promise<Map<string, string | null>> {
    if (agentPermanentIds.length === 0) {
        return new Map();
    }

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(agentTable)
        .select('permanentId,agentName')
        .in('permanentId', [...new Set(agentPermanentIds)]);

    if (error) {
        throw new Error(`Failed to load admin task-manager agents: ${error.message}`);
    }

    return new Map(
        ((data || []) as Array<AdminChatTaskAgentLookupRow>)
            .filter((agentRow): agentRow is AdminChatTaskAgentLookupRow & { permanentId: string } =>
                Boolean(agentRow.permanentId),
            )
            .map((agentRow) => [agentRow.permanentId, agentRow.agentName] as const),
    );
}
