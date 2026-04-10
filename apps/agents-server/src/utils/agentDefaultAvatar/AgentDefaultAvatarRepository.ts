import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from 'spacetrim';
import type { AgentDefaultAvatarParameters } from './AgentDefaultAvatarParameters';

/**
 * Stored deterministic avatar row loaded from the database.
 */
export type AgentDefaultAvatarRecord = {
    agentFingerprint: string;
    agentPermanentId: string | null;
    sourceHash: string;
    schemaVersion: string;
    renderVersion: string;
    parameters: AgentDefaultAvatarParameters;
};

/**
 * Persistence surface used by the deterministic avatar stage-1 cache and lock coordination.
 */
export type AgentDefaultAvatarRepository = {
    loadByFingerprint(agentFingerprint: string): Promise<AgentDefaultAvatarRecord | null>;
    insert(record: AgentDefaultAvatarRecord): Promise<void>;
    tryAcquireGenerationLock(lockKey: string, expiresAtIso: string): Promise<boolean>;
    loadGenerationLockExpiration(lockKey: string): Promise<string | null>;
    releaseGenerationLock(lockKey: string): Promise<void>;
};

/**
 * Minimal error shape used by dynamic Supabase reads and writes.
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
 * Minimal response shape for write operations.
 */
type SupabaseWriteResponse = {
    error: SupabaseErrorLike | null;
};

/**
 * Minimal dynamic Supabase API used by this repository.
 */
type SupabaseLike = {
    from: (tableName: string) => {
        select: (columns: string) => {
            eq: (column: string, value: string) => {
                single: () => Promise<SupabaseSingleResponse>;
            };
        };
        insert: (values: unknown) => Promise<SupabaseWriteResponse>;
        delete: () => {
            eq: (column: string, value: string) => Promise<SupabaseWriteResponse>;
        };
    };
};

/**
 * Creates the repository used by the deterministic avatar pipeline.
 *
 * @returns Repository bound to the current server prefix.
 */
export function createAgentDefaultAvatarRepository(): AgentDefaultAvatarRepository {
    return {
        async loadByFingerprint(agentFingerprint: string): Promise<AgentDefaultAvatarRecord | null> {
            const supabase = getSupabaseUnsafe();
            const tableName = await getAgentDefaultAvatarTableName();
            const { data, error } = await supabase
                .from(tableName)
                .select('agentFingerprint,agentPermanentId,sourceHash,schemaVersion,renderVersion,parameters')
                .eq('agentFingerprint', agentFingerprint)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }

                throw new DatabaseError(
                    spaceTrim(`
                        Failed to load deterministic avatar parameters for fingerprint \`${agentFingerprint}\`.

                        ${error.message}
                    `),
                );
            }

            const row = data as AgentDefaultAvatarRecord | null;
            return row ?? null;
        },

        async insert(record: AgentDefaultAvatarRecord): Promise<void> {
            const supabase = getSupabaseUnsafe();
            const tableName = await getAgentDefaultAvatarTableName();
            const { error } = await supabase.from(tableName).insert(record);

            if (!error) {
                return;
            }

            throw new DatabaseError(
                spaceTrim(`
                    Failed to store deterministic avatar parameters for fingerprint \`${record.agentFingerprint}\`.

                    ${error.message}
                `),
            );
        },

        async tryAcquireGenerationLock(lockKey: string, expiresAtIso: string): Promise<boolean> {
            const supabase = getSupabaseUnsafe();
            const lockTableName = await $getTableName('GenerationLock');
            const { error } = await supabase.from(lockTableName).insert({
                lockKey,
                expiresAt: expiresAtIso,
            });

            if (!error) {
                return true;
            }

            if (error.code === '23505' || error.code === '409' || error.message.toLowerCase().includes('duplicate')) {
                return false;
            }

            throw new DatabaseError(
                spaceTrim(`
                    Failed to acquire deterministic-avatar generation lock \`${lockKey}\`.

                    ${error.message}
                `),
            );
        },

        async loadGenerationLockExpiration(lockKey: string): Promise<string | null> {
            const supabase = getSupabaseUnsafe();
            const lockTableName = await $getTableName('GenerationLock');
            const { data, error } = await supabase.from(lockTableName).select('expiresAt').eq('lockKey', lockKey).single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }

                throw new DatabaseError(
                    spaceTrim(`
                        Failed to read deterministic-avatar generation lock \`${lockKey}\`.

                        ${error.message}
                    `),
                );
            }

            const lockRow = data as { expiresAt?: string } | null;
            return lockRow?.expiresAt || null;
        },

        async releaseGenerationLock(lockKey: string): Promise<void> {
            const supabase = getSupabaseUnsafe();
            const lockTableName = await $getTableName('GenerationLock');
            const { error } = await supabase.from(lockTableName).delete().eq('lockKey', lockKey);

            if (!error || error.code === 'PGRST116') {
                return;
            }

            throw new DatabaseError(
                spaceTrim(`
                    Failed to release deterministic-avatar generation lock \`${lockKey}\`.

                    ${error.message}
                `),
            );
        },
    };
}

/**
 * Returns a loosely typed Supabase client for dynamic-table helpers.
 *
 * @returns Minimal dynamic Supabase client.
 */
function getSupabaseUnsafe(): SupabaseLike {
    return $provideSupabaseForServer() as unknown as SupabaseLike;
}

/**
 * Resolves the prefixed deterministic-avatar table name without depending on generated schema typings.
 *
 * @returns Fully prefixed table name.
 */
async function getAgentDefaultAvatarTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}AgentDefaultAvatar`;
}
