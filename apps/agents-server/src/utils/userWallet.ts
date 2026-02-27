import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Wallet service id used by USE PROJECT for GitHub credentials.
 */
export const USE_PROJECT_GITHUB_WALLET_SERVICE = 'github';

/**
 * Wallet key used by USE PROJECT for GitHub credentials.
 */
export const USE_PROJECT_GITHUB_WALLET_KEY = 'use-project-github-token';

/**
 * Supported wallet record types.
 */
export type UserWalletRecordType = 'USERNAME_PASSWORD' | 'SESSION_COOKIE' | 'ACCESS_TOKEN';

/**
 * Database row shape for `UserWallet` table.
 */
type UserWalletRow = AgentsServerDatabase['public']['Tables']['UserWallet']['Row'];

/**
 * Input payload for inserting/updating `UserWallet`.
 */
type UserWalletInsert = AgentsServerDatabase['public']['Tables']['UserWallet']['Insert'];

/**
 * Normalized wallet record returned by API and runtime adapters.
 */
export type UserWalletRecord = {
    id: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    agentPermanentId: string | null;
    recordType: UserWalletRecordType;
    service: string;
    key: string;
    username: string | null;
    password: string | null;
    secret: string | null;
    cookies: string | null;
    isGlobal: boolean;
    deletedAt: string | null;
};

/**
 * List query options for wallet records.
 */
export type ListUserWalletRecordsOptions = {
    userId: number;
    agentPermanentId?: string;
    includeGlobal?: boolean;
    search?: string;
    recordType?: UserWalletRecordType;
    service?: string;
    key?: string;
    limit?: number;
};

/**
 * Create payload for wallet records.
 */
export type CreateUserWalletRecordOptions = {
    userId: number;
    agentPermanentId?: string | null;
    isGlobal: boolean;
    recordType: UserWalletRecordType;
    service: string;
    key?: string;
    username?: string;
    password?: string;
    secret?: string;
    cookies?: string;
};

/**
 * Update payload for wallet records.
 */
export type UpdateUserWalletRecordOptions = CreateUserWalletRecordOptions & {
    walletId: number;
};

/**
 * Delete payload for wallet records.
 */
export type DeleteUserWalletRecordOptions = {
    userId: number;
    walletId: number;
};

/**
 * Read payload for wallet records by id.
 */
export type FindUserWalletByIdOptions = {
    userId: number;
    walletId: number;
};

/**
 * Token resolution options for USE PROJECT.
 */
export type ResolveUseProjectGithubTokenOptions = {
    userId: number;
    agentPermanentId?: string;
};

/**
 * Lists wallet records filtered by scope and optional query.
 */
export async function listUserWalletRecords(options: ListUserWalletRecordsOptions): Promise<UserWalletRecord[]> {
    const { userId, agentPermanentId, includeGlobal = true, search, recordType, service, key, limit } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserWallet');

    let rows: UserWalletRow[] = [];

    if (!agentPermanentId) {
        const { data, error } = await supabase.from(tableName).select('*').eq('userId', userId).is('deletedAt', null);
        if (error) {
            throw new Error(`Failed to list wallet records: ${error.message}`);
        }
        rows = (data || []) as UserWalletRow[];
    } else {
        const scopedRows: UserWalletRow[] = [];

        const { data: agentData, error: agentError } = await supabase
            .from(tableName)
            .select('*')
            .eq('userId', userId)
            .eq('isGlobal', false)
            .eq('agentPermanentId', agentPermanentId)
            .is('deletedAt', null);

        if (agentError) {
            throw new Error(`Failed to list scoped wallet records: ${agentError.message}`);
        }
        scopedRows.push(...((agentData || []) as UserWalletRow[]));

        if (includeGlobal) {
            const { data: globalData, error: globalError } = await supabase
                .from(tableName)
                .select('*')
                .eq('userId', userId)
                .eq('isGlobal', true)
                .is('agentPermanentId', null)
                .is('deletedAt', null);

            if (globalError) {
                throw new Error(`Failed to list global wallet records: ${globalError.message}`);
            }

            scopedRows.push(...((globalData || []) as UserWalletRow[]));
        }

        rows = scopedRows;
    }

    const normalizedSearch = search?.trim().toLowerCase();
    const normalizedService = service?.trim().toLowerCase();
    const normalizedKey = key?.trim();

    const filteredRows = rows.filter((row) => {
        if (recordType && row.recordType !== recordType) {
            return false;
        }
        if (normalizedService && row.service.toLowerCase() !== normalizedService) {
            return false;
        }
        if (normalizedKey && row.key !== normalizedKey) {
            return false;
        }
        if (!normalizedSearch) {
            return true;
        }

        const searchable = [row.service, row.key, row.username || '', row.secret || '', row.cookies || '']
            .join(' ')
            .toLowerCase();
        return searchable.includes(normalizedSearch);
    });

    const sortedRows = filteredRows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const limitedRows =
        typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? sortedRows.slice(0, limit) : sortedRows;

    return limitedRows.map(mapUserWalletRow);
}

/**
 * Creates one wallet record or updates existing record with the same scope identity.
 */
export async function createUserWalletRecord(options: CreateUserWalletRecordOptions): Promise<UserWalletRecord> {
    const payload = normalizeWalletPayload(options);
    const existing = await findExistingWalletRecord(payload);
    if (existing) {
        return updateUserWalletRecord({
            userId: options.userId,
            walletId: existing.id,
            agentPermanentId: payload.agentPermanentId ?? null,
            isGlobal: payload.isGlobal ?? false,
            recordType: payload.recordType as UserWalletRecordType,
            service: payload.service,
            key: payload.key,
            username: payload.username ?? undefined,
            password: payload.password ?? undefined,
            secret: payload.secret ?? undefined,
            cookies: payload.cookies ?? undefined,
        });
    }

    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserWallet');
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
        throw new Error(error?.message || 'Failed to create wallet record.');
    }

    return mapUserWalletRow(data as UserWalletRow);
}

/**
 * Updates one wallet record owned by a user.
 */
export async function updateUserWalletRecord(options: UpdateUserWalletRecordOptions): Promise<UserWalletRecord> {
    const payload = normalizeWalletPayload(options);
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserWallet');

    const { data, error } = await supabase
        .from(tableName)
        .update({
            ...payload,
            updatedAt: new Date().toISOString(),
        })
        .eq('id', options.walletId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to update wallet record.');
    }

    return mapUserWalletRow(data as UserWalletRow);
}

/**
 * Soft deletes one wallet record owned by a user.
 */
export async function deleteUserWalletRecord(options: DeleteUserWalletRecordOptions): Promise<boolean> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserWallet');
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from(tableName)
        .update({
            deletedAt: now,
            updatedAt: now,
        })
        .eq('id', options.walletId)
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
 * Finds one wallet record by id for a specific user.
 */
export async function findUserWalletRecordById(options: FindUserWalletByIdOptions): Promise<UserWalletRecord | null> {
    const row = await findUserWalletRowById(options);
    return row ? mapUserWalletRow(row) : null;
}

/**
 * Resolves GitHub token for USE PROJECT from wallet (agent scope first, then global).
 */
export async function resolveUseProjectGithubTokenFromWallet(
    options: ResolveUseProjectGithubTokenOptions,
): Promise<string | undefined> {
    const scoped = await findLatestWalletAccessToken({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        isGlobal: false,
    });
    if (scoped) {
        return scoped;
    }

    return findLatestWalletAccessToken({
        userId: options.userId,
        isGlobal: true,
    });
}

/**
 * Finds latest wallet access token by scope.
 */
async function findLatestWalletAccessToken(options: {
    userId: number;
    agentPermanentId?: string;
    isGlobal: boolean;
}): Promise<string | undefined> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserWallet');
    let query = supabase
        .from(tableName)
        .select('*')
        .eq('userId', options.userId)
        .eq('recordType', 'ACCESS_TOKEN')
        .eq('service', USE_PROJECT_GITHUB_WALLET_SERVICE)
        .eq('key', USE_PROJECT_GITHUB_WALLET_KEY)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
        .limit(1);

    if (options.isGlobal) {
        query = query.eq('isGlobal', true).is('agentPermanentId', null);
    } else if (options.agentPermanentId) {
        query = query.eq('isGlobal', false).eq('agentPermanentId', options.agentPermanentId);
    } else {
        return undefined;
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
        throw new Error(`Failed to resolve project token from wallet: ${error.message}`);
    }

    const row = data as UserWalletRow | null;
    const token = row?.secret?.trim();
    return token || undefined;
}

/**
 * Finds raw wallet row by id.
 */
async function findUserWalletRowById(options: FindUserWalletByIdOptions): Promise<UserWalletRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserWallet');

    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', options.walletId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to find wallet record ${options.walletId}: ${error.message}`);
    }

    return (data as UserWalletRow | null) || null;
}

/**
 * Finds existing active wallet record by the same scope identity.
 */
async function findExistingWalletRecord(payload: UserWalletInsert): Promise<UserWalletRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserWallet');

    let scopedAgentPermanentId: string | null = null;
    if (!payload.isGlobal) {
        if (typeof payload.agentPermanentId !== 'string' || payload.agentPermanentId.trim() === '') {
            throw new Error('Agent-scoped wallet record requires `agentPermanentId`.');
        }
        scopedAgentPermanentId = payload.agentPermanentId;
    }

    let query = supabase
        .from(tableName)
        .select('*')
        .eq('userId', payload.userId)
        .eq('recordType', payload.recordType || '')
        .eq('service', payload.service || '')
        .eq('key', payload.key || '')
        .eq('isGlobal', payload.isGlobal || false)
        .is('deletedAt', null);

    if (payload.isGlobal) {
        query = query.is('agentPermanentId', null);
    } else {
        if (!scopedAgentPermanentId) {
            throw new Error('Agent-scoped wallet record requires `agentPermanentId`.');
        }
        query = query.eq('agentPermanentId', scopedAgentPermanentId);
    }

    const { data, error } = await query.order('updatedAt', { ascending: false }).limit(1).maybeSingle();
    if (error) {
        throw new Error(`Failed to check duplicate wallet record: ${error.message}`);
    }

    return (data as UserWalletRow | null) || null;
}

/**
 * Normalizes wallet payload and validates scope and record-specific required fields.
 */
function normalizeWalletPayload(options: CreateUserWalletRecordOptions): UserWalletInsert {
    const service = options.service.trim().toLowerCase();
    if (!service) {
        throw new Error('Wallet service is required.');
    }

    const key = options.key?.trim() || 'default';
    const isGlobal = options.isGlobal === true;
    const agentPermanentId = isGlobal ? null : options.agentPermanentId?.trim() || null;

    if (!isGlobal && !agentPermanentId) {
        throw new Error('Agent-scoped wallet record requires `agentPermanentId`.');
    }

    const recordType = normalizeWalletRecordType(options.recordType);
    const username = options.username?.trim() || null;
    const password = options.password?.trim() || null;
    const secret = options.secret?.trim() || null;
    const cookies = options.cookies?.trim() || null;

    if (recordType === 'USERNAME_PASSWORD' && (!username || !password)) {
        throw new Error('USERNAME_PASSWORD records require both username and password.');
    }

    if (recordType === 'SESSION_COOKIE' && !cookies) {
        throw new Error('SESSION_COOKIE records require cookies.');
    }

    if (recordType === 'ACCESS_TOKEN' && !secret) {
        throw new Error('ACCESS_TOKEN records require secret.');
    }

    return {
        userId: options.userId,
        agentPermanentId,
        isGlobal,
        recordType,
        service,
        key,
        username,
        password,
        secret,
        cookies,
    };
}

/**
 * Normalizes and validates one wallet record type.
 */
function normalizeWalletRecordType(value: unknown): UserWalletRecordType {
    if (value === 'USERNAME_PASSWORD') {
        return value;
    }

    if (value === 'SESSION_COOKIE') {
        return value;
    }

    if (value === 'ACCESS_TOKEN') {
        return value;
    }

    throw new Error('Unsupported wallet record type. Use USERNAME_PASSWORD, SESSION_COOKIE, or ACCESS_TOKEN.');
}

/**
 * Maps raw row to normalized wallet record.
 */
function mapUserWalletRow(row: UserWalletRow): UserWalletRecord {
    return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        userId: row.userId,
        agentPermanentId: row.agentPermanentId,
        recordType: row.recordType as UserWalletRecordType,
        service: row.service,
        key: row.key,
        username: row.username,
        password: row.password,
        secret: row.secret,
        cookies: row.cookies,
        isGlobal: row.isGlobal,
        deletedAt: row.deletedAt,
    };
}
