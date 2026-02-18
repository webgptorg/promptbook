import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import type { UserInfo } from '@/src/utils/getCurrentUser';

/**
 * Database row shape for `UserMemory` table.
 */
type UserMemoryRow = AgentsServerDatabase['public']['Tables']['UserMemory']['Row'];

/**
 * Input payload for inserting/updating `UserMemory`.
 */
type UserMemoryInsert = AgentsServerDatabase['public']['Tables']['UserMemory']['Insert'];

/**
 * Normalized user memory record used by API handlers and adapters.
 */
export type UserMemoryRecord = {
    id: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    agentPermanentId: string | null;
    content: string;
    isGlobal: boolean;
    deletedAt: string | null;
};

/**
 * Resolved current user identity including database user id.
 */
export type ResolvedCurrentUserMemoryIdentity = {
    user: UserInfo;
    userId: number;
};

/**
 * Memory listing options.
 */
export type ListUserMemoriesOptions = {
    userId: number;
    agentPermanentId?: string;
    includeGlobal?: boolean;
    search?: string;
    limit?: number;
};

/**
 * Memory create options.
 */
export type CreateUserMemoryOptions = {
    userId: number;
    content: string;
    isGlobal: boolean;
    agentPermanentId?: string | null;
};

/**
 * Memory update options.
 */
export type UpdateUserMemoryOptions = {
    userId: number;
    memoryId: number;
    content: string;
    isGlobal: boolean;
    agentPermanentId?: string | null;
};

/**
 * Memory delete options.
 */
export type DeleteUserMemoryOptions = {
    userId: number;
    memoryId: number;
};

/**
 * Options for retrieving a single memory record by id.
 */
export type FindUserMemoryByIdOptions = {
    userId: number;
    memoryId: number;
};

/**
 * Resolves current user and ensures there is a matching database row.
 */
export async function resolveCurrentUserMemoryIdentity(): Promise<ResolvedCurrentUserMemoryIdentity | null> {
    try {
        const identity = await resolveCurrentUserIdentity();
        if (!identity) {
            return null;
        }

        const resolvedUser: UserInfo = identity.sessionUser ?? {
            username: identity.username,
            isAdmin: identity.isAdmin,
            profileImageUrl: null,
        };

        return {
            user: resolvedUser,
            userId: identity.userId,
        };
    } catch (error) {
        console.error('[user-memory] Failed to resolve current user identity:', error);
        return null;
    }
}

/**
 * Lists user memories filtered by scope and optional search.
 */
export async function listUserMemories(options: ListUserMemoriesOptions): Promise<UserMemoryRecord[]> {
    const { userId, agentPermanentId, includeGlobal = true, search, limit } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserMemory');

    let rows: UserMemoryRow[] = [];

    if (!agentPermanentId) {
        const { data, error } = await supabase.from(tableName).select('*').eq('userId', userId).is('deletedAt', null);
        if (error) {
            throw new Error(`Failed to list user memories: ${error.message}`);
        }
        rows = (data || []) as UserMemoryRow[];
    } else {
        const scopedRows: UserMemoryRow[] = [];

        const { data: agentData, error: agentError } = await supabase
            .from(tableName)
            .select('*')
            .eq('userId', userId)
            .eq('isGlobal', false)
            .eq('agentPermanentId', agentPermanentId)
            .is('deletedAt', null);

        if (agentError) {
            throw new Error(`Failed to list scoped user memories: ${agentError.message}`);
        }

        scopedRows.push(...((agentData || []) as UserMemoryRow[]));

        if (includeGlobal) {
            const { data: globalData, error: globalError } = await supabase
                .from(tableName)
                .select('*')
                .eq('userId', userId)
                .eq('isGlobal', true)
                .is('agentPermanentId', null)
                .is('deletedAt', null);

            if (globalError) {
                throw new Error(`Failed to list global user memories: ${globalError.message}`);
            }

            scopedRows.push(...((globalData || []) as UserMemoryRow[]));
        }

        rows = scopedRows;
    }

    const normalizedSearch = search?.trim().toLowerCase();
    const filteredRows = normalizedSearch
        ? rows.filter((row) => row.content.toLowerCase().includes(normalizedSearch))
        : rows;

    const sortedRows = filteredRows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const limitedRows =
        typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? sortedRows.slice(0, limit) : sortedRows;

    return limitedRows.map(mapUserMemoryRow);
}

/**
 * Creates one user memory record and returns it.
 */
export async function createUserMemory(options: CreateUserMemoryOptions): Promise<UserMemoryRecord> {
    const payload = normalizeMemoryPayload(options);
    const duplicate = await findDuplicateUserMemory(payload);
    if (duplicate) {
        return mapUserMemoryRow(duplicate);
    }

    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserMemory');
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from(tableName)
        .insert({
            ...payload,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        })
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to create user memory.');
    }

    return mapUserMemoryRow(data as UserMemoryRow);
}

/**
 * Updates one user memory record owned by a user.
 */
export async function updateUserMemory(options: UpdateUserMemoryOptions): Promise<UserMemoryRecord> {
    const payload = normalizeMemoryPayload({
        userId: options.userId,
        content: options.content,
        isGlobal: options.isGlobal,
        agentPermanentId: options.agentPermanentId,
    });

    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserMemory');
    const { data, error } = await supabase
        .from(tableName)
        .update({
            ...payload,
            updatedAt: new Date().toISOString(),
        })
        .eq('id', options.memoryId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to update user memory.');
    }

    return mapUserMemoryRow(data as UserMemoryRow);
}

/**
 * Deletes one user memory record owned by a user.
 */
export async function deleteUserMemory(options: DeleteUserMemoryOptions): Promise<boolean> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserMemory');

    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from(tableName)
        .update({
            deletedAt: now,
            updatedAt: now,
        })
        .eq('id', options.memoryId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .select('id')
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return Boolean(data);
}

/**
 * Finds one memory record by id for a specific user.
 *
 * @private Internal helper for user memory services.
 */
export async function findUserMemoryRecordById(options: FindUserMemoryByIdOptions): Promise<UserMemoryRecord | null> {
    const row = await findUserMemoryRowById(options);
    if (!row) {
        return null;
    }

    return mapUserMemoryRow(row);
}

/**
 * Finds the raw user memory row for the requested record.
 *
 * @private Internal helper for user memory services.
 */
async function findUserMemoryRowById(options: FindUserMemoryByIdOptions): Promise<UserMemoryRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserMemory');

    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', options.memoryId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to find memory ${options.memoryId}: ${error.message}`);
    }

    return (data as UserMemoryRow | null) || null;
}

/**
 * Finds a database user by username.
 */

/**
 * Normalizes memory payload for create/update operations.
 */
function normalizeMemoryPayload(options: CreateUserMemoryOptions): UserMemoryInsert {
    const content = options.content.trim();
    if (!content) {
        throw new Error('Memory content cannot be empty.');
    }

    const isGlobal = options.isGlobal === true;
    const agentPermanentId = isGlobal ? null : options.agentPermanentId?.trim() || null;

    if (!isGlobal && !agentPermanentId) {
        throw new Error('Agent memory requires `agentPermanentId`.');
    }

    return {
        userId: options.userId,
        content,
        isGlobal,
        agentPermanentId,
    };
}

/**
 * Finds duplicate memory by same scope and content.
 */
async function findDuplicateUserMemory(payload: UserMemoryInsert): Promise<UserMemoryRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserMemory');
    let query = supabase
        .from(tableName)
        .select('*')
        .eq('userId', payload.userId)
        .eq('content', payload.content)
        .eq('isGlobal', payload.isGlobal!);
    query = query.is('deletedAt', null);

    if (payload.isGlobal) {
        query = query.is('agentPermanentId', null);
    } else {
        query = query.eq('agentPermanentId', payload.agentPermanentId || '');
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
        throw new Error(`Failed to check duplicate memory: ${error.message}`);
    }

    return (data as UserMemoryRow | null) || null;
}

/**
 * Maps raw database row to normalized memory record.
 */
function mapUserMemoryRow(row: UserMemoryRow): UserMemoryRecord {
    return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        userId: row.userId,
        agentPermanentId: row.agentPermanentId,
        content: row.content,
        isGlobal: row.isGlobal,
        deletedAt: row.deletedAt,
    };
}
