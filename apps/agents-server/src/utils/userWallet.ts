import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';
import {
    USE_EMAIL_SMTP_WALLET_KEY,
    USE_EMAIL_SMTP_WALLET_SERVICE,
} from './useEmailSmtpWalletConstants';
import {
    USE_PROJECT_GITHUB_APP_WALLET_KEY,
    USE_PROJECT_GITHUB_WALLET_KEY,
    USE_PROJECT_GITHUB_WALLET_SERVICE,
} from './useProjectGithubWalletConstants';

/**
 * Wallet service id used by USE PROJECT for GitHub credentials.
 */
export { USE_PROJECT_GITHUB_WALLET_SERVICE, USE_PROJECT_GITHUB_WALLET_KEY, USE_PROJECT_GITHUB_APP_WALLET_KEY };

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
 * JSON schema payload optionally attached to one wallet record.
 */
type UserWalletJsonSchema = UserWalletRow['jsonSchema'];

/**
 * Normalized wallet record returned by API and runtime adapters.
 */
export type UserWalletRecord = {
    id: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    isUserScoped: boolean;
    agentPermanentId: string | null;
    recordType: UserWalletRecordType;
    service: string;
    key: string;
    jsonSchema: UserWalletJsonSchema;
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
    isUserScoped?: boolean;
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
    isUserScoped?: boolean;
    isGlobal: boolean;
    recordType: UserWalletRecordType;
    service: string;
    key?: string;
    jsonSchema?: unknown;
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
    userId?: number;
    agentPermanentId?: string;
};

/**
 * SMTP credential resolution options for USE EMAIL.
 */
export type ResolveUseEmailSmtpCredentialOptions = {
    userId?: number;
    agentPermanentId?: string;
};

/**
 * Lists wallet records filtered by scope and optional query.
 */
export async function listUserWalletRecords(options: ListUserWalletRecordsOptions): Promise<UserWalletRecord[]> {
    const {
        userId,
        agentPermanentId,
        includeGlobal = true,
        isUserScoped,
        search,
        recordType,
        service,
        key,
        limit,
    } = options;
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

        const { data: agentUserData, error: agentUserError } = await supabase
            .from(tableName)
            .select('*')
            .eq('isUserScoped', true)
            .eq('userId', userId)
            .eq('isGlobal', false)
            .eq('agentPermanentId', agentPermanentId)
            .is('deletedAt', null);

        if (agentUserError) {
            throw new Error(`Failed to list user-scoped wallet records: ${agentUserError.message}`);
        }
        scopedRows.push(...((agentUserData || []) as UserWalletRow[]));

        const { data: agentSharedData, error: agentSharedError } = await supabase
            .from(tableName)
            .select('*')
            .eq('isUserScoped', false)
            .eq('isGlobal', false)
            .eq('agentPermanentId', agentPermanentId)
            .is('deletedAt', null);

        if (agentSharedError) {
            throw new Error(`Failed to list agent-scoped wallet records: ${agentSharedError.message}`);
        }
        scopedRows.push(...((agentSharedData || []) as UserWalletRow[]));

        if (includeGlobal) {
            const { data: userGlobalData, error: userGlobalError } = await supabase
                .from(tableName)
                .select('*')
                .eq('isUserScoped', true)
                .eq('userId', userId)
                .eq('isGlobal', true)
                .is('agentPermanentId', null)
                .is('deletedAt', null);

            if (userGlobalError) {
                throw new Error(`Failed to list user-global wallet records: ${userGlobalError.message}`);
            }
            scopedRows.push(...((userGlobalData || []) as UserWalletRow[]));

            const { data: globalData, error: globalError } = await supabase
                .from(tableName)
                .select('*')
                .eq('isUserScoped', false)
                .eq('isGlobal', true)
                .is('agentPermanentId', null)
                .is('deletedAt', null);

            if (globalError) {
                throw new Error(`Failed to list global wallet records: ${globalError.message}`);
            }

            scopedRows.push(...((globalData || []) as UserWalletRow[]));
        }

        const rowsById = new Map<number, UserWalletRow>();
        for (const row of scopedRows) {
            rowsById.set(row.id, row);
        }
        rows = [...rowsById.values()];
    }

    const normalizedSearch = search?.trim().toLowerCase();
    const normalizedService = service?.trim().toLowerCase();
    const normalizedKey = key?.trim();
    const hasUserScopeFilter = typeof isUserScoped === 'boolean';

    const filteredRows = rows.filter((row) => {
        if (hasUserScopeFilter && row.isUserScoped !== isUserScoped) {
            return false;
        }
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
            .concat(row.jsonSchema ? JSON.stringify(row.jsonSchema) : '')
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
            isUserScoped: payload.isUserScoped ?? false,
            isGlobal: payload.isGlobal ?? false,
            recordType: payload.recordType as UserWalletRecordType,
            service: payload.service,
            key: payload.key,
            jsonSchema: payload.jsonSchema,
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
 * Resolves GitHub token for USE PROJECT from wallet using scope priority:
 * user+agent -> agent-only -> user-only -> server-global.
 */
export async function resolveUseProjectGithubTokenFromWallet(
    options: ResolveUseProjectGithubTokenOptions,
): Promise<string | undefined> {
    return resolveWalletAccessTokenFromScopes({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        service: USE_PROJECT_GITHUB_WALLET_SERVICE,
        key: USE_PROJECT_GITHUB_WALLET_KEY,
        errorContext: 'project',
    });
}

/**
 * Resolves SMTP credential payload for USE EMAIL from wallet using scope priority:
 * user+agent -> agent-only -> user-only -> server-global.
 */
export async function resolveUseEmailSmtpCredentialFromWallet(
    options: ResolveUseEmailSmtpCredentialOptions,
): Promise<string | undefined> {
    return resolveWalletAccessTokenFromScopes({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        service: USE_EMAIL_SMTP_WALLET_SERVICE,
        key: USE_EMAIL_SMTP_WALLET_KEY,
        errorContext: 'email SMTP',
    });
}

/**
 * Stores a GitHub App-generated USE PROJECT token in wallet with configurable scopes.
 */
export async function storeUseProjectGithubAppTokenInWallet(options: {
    userId: number;
    token: string;
    isUserScoped?: boolean;
    isGlobal?: boolean;
    agentPermanentId?: string | null;
}): Promise<UserWalletRecord> {
    const normalizedAgentPermanentId = options.agentPermanentId?.trim() || null;
    const isGlobal = options.isGlobal === true || (!normalizedAgentPermanentId && options.isGlobal !== false);

    return createUserWalletRecord({
        userId: options.userId,
        isUserScoped: options.isUserScoped === true,
        isGlobal,
        agentPermanentId: isGlobal ? null : normalizedAgentPermanentId,
        recordType: 'ACCESS_TOKEN',
        service: USE_PROJECT_GITHUB_WALLET_SERVICE,
        key: USE_PROJECT_GITHUB_APP_WALLET_KEY,
        secret: options.token,
    });
}

/**
 * Resolves wallet access token from all supported scope combinations.
 */
async function resolveWalletAccessTokenFromScopes(options: {
    userId?: number;
    agentPermanentId?: string;
    service: string;
    key: string;
    errorContext: string;
}): Promise<string | undefined> {
    if (options.agentPermanentId) {
        const userAndAgentScoped = await findLatestWalletAccessToken({
            userId: options.userId,
            isUserScoped: true,
            isGlobal: false,
            agentPermanentId: options.agentPermanentId,
            service: options.service,
            key: options.key,
            errorContext: options.errorContext,
        });
        if (userAndAgentScoped) {
            return userAndAgentScoped;
        }

        const agentScoped = await findLatestWalletAccessToken({
            userId: options.userId,
            isUserScoped: false,
            isGlobal: false,
            agentPermanentId: options.agentPermanentId,
            service: options.service,
            key: options.key,
            errorContext: options.errorContext,
        });
        if (agentScoped) {
            return agentScoped;
        }
    }

    const userScoped = await findLatestWalletAccessToken({
        userId: options.userId,
        isUserScoped: true,
        isGlobal: true,
        service: options.service,
        key: options.key,
        errorContext: options.errorContext,
    });
    if (userScoped) {
        return userScoped;
    }

    return findLatestWalletAccessToken({
        userId: options.userId,
        isUserScoped: false,
        isGlobal: true,
        service: options.service,
        key: options.key,
        errorContext: options.errorContext,
    });
}

/**
 * Finds latest wallet access token by exact scope.
 */
async function findLatestWalletAccessToken(options: {
    userId?: number;
    isUserScoped: boolean;
    isGlobal: boolean;
    agentPermanentId?: string;
    service: string;
    key: string;
    errorContext: string;
}): Promise<string | undefined> {
    if (options.isUserScoped && !options.userId) {
        return undefined;
    }

    if (!options.isGlobal && !options.agentPermanentId) {
        return undefined;
    }

    if (!options.isUserScoped && options.userId) {
        const preferredOwnedToken = await fetchLatestWalletAccessToken({
            ...options,
            ownerUserId: options.userId,
        });
        if (preferredOwnedToken) {
            return preferredOwnedToken;
        }
    }

    return fetchLatestWalletAccessToken(options);
}

/**
 * Fetches latest wallet access token using one optional owner-user preference.
 */
async function fetchLatestWalletAccessToken(options: {
    userId?: number;
    isUserScoped: boolean;
    isGlobal: boolean;
    agentPermanentId?: string;
    service: string;
    key: string;
    errorContext: string;
    ownerUserId?: number;
}): Promise<string | undefined> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserWallet');
    let query = supabase
        .from(tableName)
        .select('*')
        .eq('isUserScoped', options.isUserScoped)
        .eq('recordType', 'ACCESS_TOKEN')
        .eq('service', options.service)
        .eq('key', options.key)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
        .limit(1);

    if (options.ownerUserId) {
        query = query.eq('userId', options.ownerUserId);
    } else if (options.isUserScoped && options.userId) {
        query = query.eq('userId', options.userId);
    }

    if (options.isGlobal) {
        query = query.eq('isGlobal', true).is('agentPermanentId', null);
    } else {
        query = query.eq('isGlobal', false).eq('agentPermanentId', options.agentPermanentId || '');
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
        throw new Error(`Failed to resolve ${options.errorContext} token from wallet: ${error.message}`);
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
        .eq('isUserScoped', payload.isUserScoped === true)
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
    const isUserScoped = options.isUserScoped === true;
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
    const jsonSchema = normalizeWalletJsonSchema(options.jsonSchema);

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
        isUserScoped,
        agentPermanentId,
        isGlobal,
        recordType,
        service,
        key,
        jsonSchema,
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
 * Normalizes optional wallet JSON schema payload.
 */
function normalizeWalletJsonSchema(value: unknown): UserWalletJsonSchema {
    if (value === undefined || value === null) {
        return null;
    }

    let normalizedValue: unknown = value;
    if (typeof normalizedValue === 'string') {
        const trimmedValue = normalizedValue.trim();
        if (!trimmedValue) {
            return null;
        }

        try {
            normalizedValue = JSON.parse(trimmedValue);
        } catch {
            throw new Error('Wallet JSON schema must be valid JSON.');
        }
    }

    if (!normalizedValue || typeof normalizedValue !== 'object' || Array.isArray(normalizedValue)) {
        throw new Error('Wallet JSON schema must be a JSON object.');
    }

    try {
        return JSON.parse(JSON.stringify(normalizedValue)) as UserWalletJsonSchema;
    } catch {
        throw new Error('Wallet JSON schema must be serializable JSON.');
    }
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
        isUserScoped: row.isUserScoped,
        agentPermanentId: row.agentPermanentId,
        recordType: row.recordType as UserWalletRecordType,
        service: row.service,
        key: row.key,
        jsonSchema: row.jsonSchema,
        username: row.username,
        password: row.password,
        secret: row.secret,
        cookies: row.cookies,
        isGlobal: row.isGlobal,
        deletedAt: row.deletedAt,
    };
}
