import type { AgentBasicInformation } from '@promptbook-local/types';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { $provideServer } from '../../tools/$provideServer';
import {
    AGENT_DEFAULT_AVATAR_VERSION,
    type AgentDefaultAvatarParameters,
    agentDefaultAvatarParametersSchema,
} from './AgentDefaultAvatarParameters';

/**
 * Default lock lifetime shared by the stage-1 cached avatar-parameter generator.
 */
const DEFAULT_LOCK_TTL_MS = 1000 * 60 * 5;

/**
 * Default polling interval while waiting for a concurrent stage-1 generation to finish.
 */
const DEFAULT_WAIT_INTERVAL_MS = 1000;

/**
 * Default timeout for waiting on avatar-parameter generation.
 */
const DEFAULT_TIMEOUT_MS = 1000 * 60;

/**
 * Persisted stage-1 record returned from cache or generation.
 */
export type AgentDefaultAvatarParametersRecord = {
    version: string;
    agentFingerprint: string;
    agentPermanentId: string | null;
    agentName: string;
    parameters: AgentDefaultAvatarParameters;
    source: 'cache' | 'generated';
};

/**
 * Input required to load or create one stage-1 avatar-parameter record.
 */
export type EnsureAgentDefaultAvatarParametersOptions = {
    /**
     * Resolved agent profile used for metadata and fallback identifiers.
     */
    readonly agent: AgentBasicInformation;

    /**
     * Stable canonical fingerprint for the current agent source.
     */
    readonly agentFingerprint: string;

    /**
     * Callback that runs the stage-1 generator when the record is missing.
     */
    readonly createParameters: () => Promise<AgentDefaultAvatarParameters>;

    /**
     * Optional wait timeout override.
     */
    readonly timeoutMs?: number;

    /**
     * Optional lock TTL override.
     */
    readonly lockTtlMs?: number;

    /**
     * Optional polling interval override.
     */
    readonly waitIntervalMs?: number;
};

/**
 * Minimal error shape used by the dynamic Supabase helpers.
 */
type SupabaseErrorLike = {
    code?: string;
    message: string;
};

/**
 * Minimal response shape for `.single()` reads.
 */
type SupabaseSingleResponse = {
    data: unknown;
    error: SupabaseErrorLike | null;
};

/**
 * Minimal response shape for write queries.
 */
type SupabaseWriteResponse = {
    error: SupabaseErrorLike | null;
};

/**
 * Minimal filter-chain shape used by the dynamic Supabase helpers.
 */
type SupabaseFilterChain = {
    eq: (column: string, value: string | null) => SupabaseFilterChain;
    single: () => Promise<SupabaseSingleResponse>;
};

/**
 * Minimal chained API shape needed by the stage-1 cache helper.
 */
type SupabaseLike = {
    from: (tableName: string) => {
        select: (columns: string) => SupabaseFilterChain;
        insert: (values: unknown) => Promise<SupabaseWriteResponse>;
        delete: () => {
            eq: (column: string, value: string) => Promise<SupabaseWriteResponse>;
        };
    };
};

/**
 * Returns a loosely typed Supabase client for dynamic-table helpers.
 */
function getSupabaseUnsafe(): SupabaseLike {
    return $provideSupabaseForServer() as unknown as SupabaseLike;
}

/**
 * Resolves one runtime-prefixed table name.
 */
async function getPrefixedTableName(tableName: string): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}${tableName}`;
}

/**
 * Sleeps for the specified duration.
 */
async function sleep(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Reads one stored stage-1 record from the database.
 */
async function readExistingAgentDefaultAvatarParameters(
    avatarTableName: string,
    agentFingerprint: string,
): Promise<Omit<AgentDefaultAvatarParametersRecord, 'source'> | null> {
    const supabase = getSupabaseUnsafe();
    const { data, error } = await supabase
        .from(avatarTableName)
        .select('version,agentFingerprint,agentPermanentId,agentName,parameters')
        .eq('version', AGENT_DEFAULT_AVATAR_VERSION)
        .eq('agentFingerprint', agentFingerprint)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    if (!data) {
        return null;
    }

    const row = data as {
        version: string;
        agentFingerprint: string;
        agentPermanentId: string | null;
        agentName: string;
        parameters: unknown;
    };

    const parsedParametersResult = agentDefaultAvatarParametersSchema.safeParse(row.parameters);
    if (!parsedParametersResult.success) {
        return null;
    }

    return {
        version: String(row.version),
        agentFingerprint: String(row.agentFingerprint),
        agentPermanentId: row.agentPermanentId ? String(row.agentPermanentId) : null,
        agentName: String(row.agentName),
        parameters: parsedParametersResult.data,
    };
}

/**
 * Attempts to acquire one shared generation lock.
 */
async function tryAcquireGenerationLock(lockTableName: string, lockKey: string, lockTtlMs: number): Promise<boolean> {
    const supabase = getSupabaseUnsafe();
    const { error } = await supabase.from(lockTableName).insert({
        lockKey,
        expiresAt: new Date(Date.now() + lockTtlMs).toISOString(),
    });

    if (!error) {
        return true;
    }

    if (error.code === '23505' || error.code === '409' || error.message.toLowerCase().includes('duplicate')) {
        return false;
    }

    throw error;
}

/**
 * Deletes one generation lock if it exists.
 */
async function releaseGenerationLock(lockTableName: string, lockKey: string): Promise<void> {
    const supabase = getSupabaseUnsafe();
    const { error } = await supabase.from(lockTableName).delete().eq('lockKey', lockKey);

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
}

/**
 * Clears one expired generation lock so another request can continue.
 */
async function clearExpiredGenerationLock(lockTableName: string, lockKey: string): Promise<void> {
    const supabase = getSupabaseUnsafe();
    const { data, error } = await supabase.from(lockTableName).select('expiresAt').eq('lockKey', lockKey).single();

    if (error) {
        if (error.code === 'PGRST116') {
            return;
        }
        throw error;
    }

    const lockRow = data as { expiresAt: string } | null;
    if (!lockRow?.expiresAt) {
        return;
    }

    if (new Date(lockRow.expiresAt).getTime() > Date.now()) {
        return;
    }

    await releaseGenerationLock(lockTableName, lockKey);
}

/**
 * Returns one stored stage-1 record or creates it under a distributed lock.
 */
export async function ensureAgentDefaultAvatarParameters(
    options: EnsureAgentDefaultAvatarParametersOptions,
): Promise<AgentDefaultAvatarParametersRecord> {
    const {
        agent,
        agentFingerprint,
        createParameters,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        lockTtlMs = DEFAULT_LOCK_TTL_MS,
        waitIntervalMs = DEFAULT_WAIT_INTERVAL_MS,
    } = options;

    const supabase = getSupabaseUnsafe();
    const avatarTableName = await getPrefixedTableName('AgentAvatarParameters');
    const lockTableName = await getPrefixedTableName('GenerationLock');
    const lockKey = `agent-avatar-parameters-${AGENT_DEFAULT_AVATAR_VERSION}-${agentFingerprint}`;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const existingParameters = await readExistingAgentDefaultAvatarParameters(avatarTableName, agentFingerprint);
        if (existingParameters) {
            return {
                ...existingParameters,
                source: 'cache',
            };
        }

        const lockAcquired = await tryAcquireGenerationLock(lockTableName, lockKey, lockTtlMs);
        if (lockAcquired) {
            try {
                const existingParametersAfterLock = await readExistingAgentDefaultAvatarParameters(
                    avatarTableName,
                    agentFingerprint,
                );
                if (existingParametersAfterLock) {
                    return {
                        ...existingParametersAfterLock,
                        source: 'cache',
                    };
                }

                const parameters = await createParameters();
                const storedRow = {
                    version: AGENT_DEFAULT_AVATAR_VERSION,
                    agentFingerprint,
                    agentPermanentId: agent.permanentId || null,
                    agentName: agent.agentName,
                    parameters,
                };

                const { error: insertError } = await supabase.from(avatarTableName).insert(storedRow);
                if (insertError) {
                    const existingParametersAfterInsert = await readExistingAgentDefaultAvatarParameters(
                        avatarTableName,
                        agentFingerprint,
                    );
                    if (existingParametersAfterInsert) {
                        return {
                            ...existingParametersAfterInsert,
                            source: 'cache',
                        };
                    }

                    throw insertError;
                }

                return {
                    ...storedRow,
                    source: 'generated',
                };
            } finally {
                await releaseGenerationLock(lockTableName, lockKey);
            }
        }

        await clearExpiredGenerationLock(lockTableName, lockKey);
        await sleep(waitIntervalMs);
    }

    throw new Error(`Timeout waiting for default avatar parameters (${agent.agentName})`);
}
