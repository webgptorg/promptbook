import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { getMetadata } from '@/src/database/getMetadata';
import {
    DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS,
    TOOL_USAGE_LIMITS_METADATA_KEY,
    type TimeoutToolUsageLimits,
    type ToolUsageLimits,
} from '../constants/toolUsageLimits';

/**
 * Loads and normalizes tool-usage limits from metadata.
 *
 * @private internal utility of Agents Server
 */
export async function getToolUsageLimits(): Promise<ToolUsageLimits> {
    const rawValue = await getMetadata(TOOL_USAGE_LIMITS_METADATA_KEY);
    return normalizeToolUsageLimits(parseJsonValue(rawValue));
}

/**
 * Persists normalized tool-usage limits into metadata.
 *
 * @private internal utility of Agents Server
 */
export async function updateToolUsageLimits(nextLimits: unknown): Promise<ToolUsageLimits> {
    const normalizedLimits = normalizeToolUsageLimits(nextLimits);
    const tableName = await $getTableName('Metadata');
    const supabase = $provideSupabaseForServer();
    const nowIso = new Date().toISOString();
    const serializedLimits = JSON.stringify(normalizedLimits);

    const existingRowResult = await supabase.from(tableName).select('id').eq('key', TOOL_USAGE_LIMITS_METADATA_KEY).maybeSingle();

    if (existingRowResult.error) {
        throw new Error(`Failed to load tool-usage limits metadata: ${existingRowResult.error.message}`);
    }

    if (existingRowResult.data) {
        const updateResult = await supabase
            .from(tableName)
            .update({
                value: serializedLimits,
                updatedAt: nowIso,
            })
            .eq('key', TOOL_USAGE_LIMITS_METADATA_KEY);

        if (updateResult.error) {
            throw new Error(`Failed to update tool-usage limits metadata: ${updateResult.error.message}`);
        }
    } else {
        const insertResult = await supabase.from(tableName).insert({
            key: TOOL_USAGE_LIMITS_METADATA_KEY,
            value: serializedLimits,
            note: 'JSON configuration for tool-specific usage limits. Currently supports the `timeout` tool.',
            createdAt: nowIso,
            updatedAt: nowIso,
        });

        if (insertResult.error) {
            throw new Error(`Failed to insert tool-usage limits metadata: ${insertResult.error.message}`);
        }
    }

    return normalizedLimits;
}

/**
 * Normalizes the complete tool-limits payload while preserving unknown future keys.
 *
 * @private internal utility of Agents Server
 */
export function normalizeToolUsageLimits(rawValue: unknown): ToolUsageLimits {
    const rawLimits =
        rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
            ? (rawValue as Record<string, unknown>)
            : {};

    return {
        ...rawLimits,
        timeout: normalizeTimeoutToolUsageLimits(rawLimits.timeout),
    };
}

/**
 * Normalizes timeout-specific limits with defaults and integer guards.
 *
 * @private internal utility of Agents Server
 */
export function normalizeTimeoutToolUsageLimits(rawValue: unknown): TimeoutToolUsageLimits {
    const rawLimits =
        rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
            ? (rawValue as Record<string, unknown>)
            : {};

    return {
        maxActivePerChat: normalizePositiveInteger(rawLimits.maxActivePerChat, DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS.maxActivePerChat),
        maxFiredPerDayPerChat: normalizePositiveInteger(
            rawLimits.maxFiredPerDayPerChat,
            DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS.maxFiredPerDayPerChat,
        ),
    };
}

/**
 * Parses one metadata JSON value safely.
 *
 * @private internal utility of Agents Server
 */
function parseJsonValue(rawValue: string | null): unknown {
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
 * Normalizes one positive integer with fallback.
 *
 * @private internal utility of Agents Server
 */
function normalizePositiveInteger(rawValue: unknown, fallbackValue: number): number {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return fallbackValue;
    }

    return Math.floor(parsedValue);
}
