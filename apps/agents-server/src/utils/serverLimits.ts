import { cache } from 'react';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import { ParseError } from '../../../../src/errors/ParseError';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { getMetadataMap } from '../database/getMetadata';
import {
    DEFAULT_SERVER_LIMIT_VALUES,
    DEPRECATED_LIMIT_METADATA_KEYS,
    MAX_FILE_UPLOAD_SIZE_MB_METADATA_KEY,
    SERVER_LIMIT_DEFINITIONS,
    SERVER_LIMIT_KEYS,
    type ServerLimitDefinition,
    type ServerLimitKey,
} from '../constants/serverLimits';
import {
    TOOL_USAGE_LIMITS_METADATA_KEY,
    normalizeToolUsageLimits,
    type TimeoutToolUsageLimits,
    type ToolUsageLimits,
} from '../constants/toolUsageLimits';

/**
 * Fully normalized dedicated server-limit values keyed by limit id.
 *
 * @private internal Agents Server type
 */
export type ServerLimitValues = Record<ServerLimitKey, number>;

/**
 * Dedicated subset consumed by the `spawn_agent` tool.
 *
 * @private internal Agents Server type
 */
export type SpawnAgentLimits = {
    readonly maxDepth: number;
    readonly maxCreatedPerWindow: number;
    readonly rateLimitWindowMs: number;
};

/**
 * Row shape loaded from the dedicated `ServerLimit` table.
 *
 * @private internal Agents Server type
 */
type ServerLimitRow = {
    key: string;
    value: unknown;
};

/**
 * Cached table-backed server-limit values reused across one request/runtime tick.
 *
 * @returns Raw persisted server-limit values keyed by limit id.
 *
 * @private internal Agents Server helper
 */
const loadStoredServerLimitsCached = cache(async (): Promise<Partial<Record<ServerLimitKey, unknown>>> => {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('ServerLimit');
    const { data, error } = await supabase.from(tableName).select('key, value');

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to load dedicated server limits.

                ${error.message}
            `),
        );
    }

    const storedValues: Partial<Record<ServerLimitKey, unknown>> = {};
    for (const row of (data || []) as ServerLimitRow[]) {
        if (isServerLimitKey(row.key)) {
            storedValues[row.key] = row.value;
        }
    }

    return storedValues;
});

/**
 * Loads the fully normalized server-limit configuration.
 *
 * Stored dedicated rows override deprecated metadata fallbacks, which in turn override defaults.
 *
 * @returns Fully normalized server-limit values.
 *
 * @private internal Agents Server helper
 */
export async function getServerLimits(): Promise<ServerLimitValues> {
    const [storedValues, legacyValues] = await Promise.all([loadStoredServerLimitsCached(), loadLegacyServerLimits()]);
    return normalizeServerLimitValues({
        ...legacyValues,
        ...storedValues,
    });
}

/**
 * Persists the full dedicated server-limit configuration and keeps deprecated metadata mirrors in sync.
 *
 * @param rawValue - Unknown admin payload to normalize and persist.
 * @returns Persisted normalized server-limit values.
 *
 * @private internal Agents Server helper
 */
export async function updateServerLimits(rawValue: unknown): Promise<ServerLimitValues> {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
        throw new ParseError(
            spaceTrim(`
                Invalid server limits payload.

                Expected a JSON object with limit keys and numeric values.
            `),
        );
    }

    const normalizedValues = normalizeServerLimitValues(rawValue as Record<string, unknown>);
    const supabase = $provideSupabaseForServer();
    const serverLimitTableName = await $getTableName('ServerLimit');
    const nowIso = new Date().toISOString();
    const rows = SERVER_LIMIT_DEFINITIONS.map((definition) => ({
        key: definition.key,
        value: normalizedValues[definition.key],
        updatedAt: nowIso,
    }));

    const { error } = await supabase.from(serverLimitTableName).upsert(rows, {
        onConflict: 'key',
    });

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to persist dedicated server limits.

                ${error.message}
            `),
        );
    }

    await syncDeprecatedLimitMetadata(normalizedValues, nowIso);

    return normalizedValues;
}

/**
 * Returns the timeout tool limits in the legacy nested shape expected by existing runtime helpers.
 *
 * @returns Timeout limits payload.
 *
 * @private internal Agents Server helper
 */
export async function getTimeoutToolUsageLimits(): Promise<TimeoutToolUsageLimits> {
    const limits = await getServerLimits();
    return {
        maxActivePerChat: limits[SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT],
        maxFiredPerDayPerChat: limits[SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT],
    };
}

/**
 * Returns the legacy tool-usage payload shape used by older admin/API surfaces.
 *
 * @returns Legacy nested tool-usage limits payload.
 *
 * @private internal Agents Server helper
 */
export async function getLegacyToolUsageLimits(): Promise<ToolUsageLimits> {
    return {
        timeout: await getTimeoutToolUsageLimits(),
    };
}

/**
 * Persists only the timeout-specific legacy payload through the shared dedicated limits table.
 *
 * @param rawValue - Unknown legacy timeout payload.
 * @returns Legacy nested tool-usage limits payload.
 *
 * @private internal Agents Server helper
 */
export async function updateLegacyToolUsageLimits(rawValue: unknown): Promise<ToolUsageLimits> {
    const normalizedLegacyLimits = normalizeToolUsageLimits(rawValue);
    const currentLimits = await getServerLimits();
    const persistedLimits = await updateServerLimits({
        ...currentLimits,
        [SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT]: normalizedLegacyLimits.timeout.maxActivePerChat,
        [SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT]: normalizedLegacyLimits.timeout.maxFiredPerDayPerChat,
    });

    return {
        timeout: {
            maxActivePerChat: persistedLimits[SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT],
            maxFiredPerDayPerChat: persistedLimits[SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT],
        },
    };
}

/**
 * Loads the current maximum file upload size in megabytes.
 *
 * @returns Configured maximum file upload size in megabytes.
 *
 * @private internal Agents Server helper
 */
export async function getMaxFileUploadSizeMb(): Promise<number> {
    const limits = await getServerLimits();
    return limits[SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB];
}

/**
 * Loads the current maximum file upload size in bytes.
 *
 * @returns Configured maximum file upload size in bytes.
 *
 * @private internal Agents Server helper
 */
export async function getMaxFileUploadSizeBytes(): Promise<number> {
    return (await getMaxFileUploadSizeMb()) * 1024 * 1024;
}

/**
 * Loads the current federated import retry delay in milliseconds.
 *
 * @returns Configured federated import retry delay.
 *
 * @private internal Agents Server helper
 */
export async function getFederatedAgentImportRetryDelayMs(): Promise<number> {
    const limits = await getServerLimits();
    return limits[SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS];
}

/**
 * Loads the `spawn_agent` abuse-protection limits.
 *
 * @returns Dedicated `spawn_agent` limits.
 *
 * @private internal Agents Server helper
 */
export async function getSpawnAgentLimits(): Promise<SpawnAgentLimits> {
    const limits = await getServerLimits();
    return {
        maxDepth: limits[SERVER_LIMIT_KEYS.SPAWN_AGENT_MAX_DEPTH],
        maxCreatedPerWindow: limits[SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_MAX],
        rateLimitWindowMs: limits[SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_WINDOW_MS],
    };
}

/**
 * Normalizes one arbitrary key/value object into the supported dedicated server-limit payload.
 *
 * @param rawValue - Unknown raw limits payload.
 * @returns Fully normalized dedicated limit values.
 *
 * @private internal Agents Server helper
 */
export function normalizeServerLimitValues(rawValue: Record<string, unknown>): ServerLimitValues {
    const normalizedValues = {} as ServerLimitValues;

    for (const definition of SERVER_LIMIT_DEFINITIONS) {
        normalizedValues[definition.key] = normalizeDedicatedLimitValue(rawValue[definition.key], definition);
    }

    return normalizedValues;
}

/**
 * Loads deprecated metadata-backed limits used by older deployments and migrations.
 *
 * @returns Partial dedicated limit values resolved from legacy metadata.
 *
 * @private internal Agents Server helper
 */
async function loadLegacyServerLimits(): Promise<Partial<Record<ServerLimitKey, unknown>>> {
    const metadata = await getMetadataMap(DEPRECATED_LIMIT_METADATA_KEYS);
    const normalizedToolUsageLimits = normalizeToolUsageLimits(parseJsonValue(metadata[TOOL_USAGE_LIMITS_METADATA_KEY]));

    return {
        [SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT]: normalizedToolUsageLimits.timeout.maxActivePerChat,
        [SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT]: normalizedToolUsageLimits.timeout.maxFiredPerDayPerChat,
        [SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB]: metadata[MAX_FILE_UPLOAD_SIZE_MB_METADATA_KEY],
        [SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS]:
            metadata[SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS],
    };
}

/**
 * Keeps deprecated metadata rows synchronized with the dedicated server-limits table for backward compatibility.
 *
 * @param values - Fully normalized dedicated server-limit values.
 * @param nowIso - Shared update timestamp.
 *
 * @private internal Agents Server helper
 */
async function syncDeprecatedLimitMetadata(values: ServerLimitValues, nowIso: string): Promise<void> {
    const supabase = $provideSupabaseForServer();
    const metadataTableName = await $getTableName('Metadata');
    const { error } = await supabase.from(metadataTableName).upsert(
        [
            {
                key: TOOL_USAGE_LIMITS_METADATA_KEY,
                value: JSON.stringify({
                    timeout: {
                        maxActivePerChat: values[SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT],
                        maxFiredPerDayPerChat: values[SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT],
                    },
                } satisfies ToolUsageLimits),
                note: 'Deprecated. Manage timeout tool limits in `/admin/limits`; this metadata row is mirrored for backward compatibility.',
                updatedAt: nowIso,
            },
            {
                key: MAX_FILE_UPLOAD_SIZE_MB_METADATA_KEY,
                value: String(values[SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB]),
                note: 'Deprecated. Manage file upload size in `/admin/limits`; this metadata row is mirrored for backward compatibility.',
                updatedAt: nowIso,
            },
            {
                key: SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS,
                value: String(values[SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS]),
                note: 'Deprecated. Manage federated import retry delay in `/admin/limits`; this metadata row is mirrored for backward compatibility.',
                updatedAt: nowIso,
            },
        ],
        {
            onConflict: 'key',
        },
    );

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to sync deprecated metadata limit rows.

                ${error.message}
            `),
        );
    }
}

/**
 * Normalizes one persisted dedicated limit value using the shared definition guardrails.
 *
 * @param rawValue - Unknown persisted value.
 * @param definition - Shared limit definition.
 * @returns Safe integer value for runtime use.
 *
 * @private internal Agents Server helper
 */
function normalizeDedicatedLimitValue(rawValue: unknown, definition: ServerLimitDefinition): number {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue < definition.minimumValue) {
        return DEFAULT_SERVER_LIMIT_VALUES[definition.key];
    }

    return Math.floor(parsedValue);
}

/**
 * Parses one legacy JSON metadata value safely.
 *
 * @param rawValue - Metadata value to parse.
 * @returns Parsed JSON value or `null`.
 *
 * @private internal Agents Server helper
 */
function parseJsonValue(rawValue: string | null | undefined): unknown {
    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue);
    } catch {
        return null;
    }
}

/**
 * Returns `true` when the provided key belongs to the dedicated server-limits registry.
 *
 * @param key - Unknown persisted key.
 * @returns Whether the key is recognized.
 *
 * @private internal Agents Server helper
 */
function isServerLimitKey(key: string): key is ServerLimitKey {
    return SERVER_LIMIT_DEFINITIONS.some((definition) => definition.key === key);
}
