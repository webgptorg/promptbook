import type { SupabaseClient } from '@supabase/supabase-js';
import {
    DEFAULT_SERVER_VISIBILITY,
    parseServerVisibility,
    SERVER_VISIBILITY_METADATA_KEY,
    type ServerVisibility,
} from '../../utils/serverVisibility';

/**
 * In-memory cache TTL for middleware metadata lookups.
 *
 * @private function of createMiddlewareRequestContext
 */
const MIDDLEWARE_METADATA_CACHE_TTL_MS = 120_000;

/**
 * Metadata keys required to derive middleware access and embedding settings.
 *
 * @private function of createMiddlewareRequestContext
 */
const MIDDLEWARE_METADATA_KEYS = ['RESTRICT_IP', 'IS_EMBEDDING_ALLOWED', SERVER_VISIBILITY_METADATA_KEY];

/**
 * Metadata values loaded for one request.
 *
 * @private function of createMiddlewareRequestContext
 */
type MiddlewareMetadata = {
    readonly allowedIps: string | null;
    readonly embeddingAllowed: string | null;
    readonly serverVisibility: string | null;
};

/**
 * Parsed middleware settings derived from metadata and environment fallbacks.
 *
 * @private function of createMiddlewareRequestContext
 */
type MiddlewareSettings = {
    readonly allowedIps: string | null | undefined;
    readonly isEmbeddingAllowed: boolean;
    readonly serverVisibility: ServerVisibility;
};

/**
 * Parsed middleware metadata entry stored in the in-memory TTL cache.
 *
 * @private function of createMiddlewareRequestContext
 */
type MiddlewareMetadataCacheEntry = MiddlewareMetadata & {
    readonly loadedAt: number;
};

/**
 * Cached metadata results keyed by table prefix.
 *
 * @private function of createMiddlewareRequestContext
 */
const cachedMiddlewareMetadataByTablePrefix = new Map<string, MiddlewareMetadataCacheEntry>();

/**
 * Resolves request-level middleware settings from metadata and environment defaults.
 *
 * @param options - Supabase client and current server routing state.
 * @returns Middleware settings used by access and header policies.
 *
 * @private function of createMiddlewareRequestContext
 */
export async function resolveMiddlewareSettings(options: {
    readonly supabase: SupabaseClient | null;
    readonly canQueryServerTables: boolean;
    readonly tablePrefixForRequest: string;
}): Promise<MiddlewareSettings> {
    const middlewareMetadata = await loadMiddlewareMetadata(
        options.supabase,
        options.canQueryServerTables,
        options.tablePrefixForRequest,
    );

    return {
        allowedIps:
            middlewareMetadata.allowedIps !== null && middlewareMetadata.allowedIps !== undefined
                ? middlewareMetadata.allowedIps
                : process.env.RESTRICT_IP,
        isEmbeddingAllowed: parseBooleanMetadataValue(middlewareMetadata.embeddingAllowed, true),
        serverVisibility: parseServerVisibility(
            process.env.SERVER_VISIBILITY || middlewareMetadata.serverVisibility,
            DEFAULT_SERVER_VISIBILITY,
        ),
    };
}

/**
 * Loads metadata values for the current request when the relevant server tables are queryable.
 *
 * @param supabase - Supabase client for middleware.
 * @param canQueryServerTables - Whether the current server tables are queryable.
 * @param tablePrefixForRequest - Current request table prefix.
 * @returns Metadata values used by access and visibility checks.
 *
 * @private function of createMiddlewareRequestContext
 */
async function loadMiddlewareMetadata(
    supabase: SupabaseClient | null,
    canQueryServerTables: boolean,
    tablePrefixForRequest: string,
): Promise<MiddlewareMetadata> {
    if (!supabase || !canQueryServerTables) {
        return {
            allowedIps: null,
            embeddingAllowed: null,
            serverVisibility: null,
        };
    }

    return loadCachedMiddlewareMetadata(supabase, tablePrefixForRequest);
}

/**
 * Loads metadata values for one table prefix with a short TTL cache.
 *
 * @param supabase - Supabase client used to query metadata.
 * @param tablePrefix - Table prefix for the current server.
 * @returns Cached metadata values for access and visibility checks.
 *
 * @private function of createMiddlewareRequestContext
 */
async function loadCachedMiddlewareMetadata(supabase: SupabaseClient, tablePrefix: string): Promise<MiddlewareMetadata> {
    const normalizedTablePrefix = tablePrefix.trim();
    const cachedMiddlewareMetadata = cachedMiddlewareMetadataByTablePrefix.get(normalizedTablePrefix);

    if (cachedMiddlewareMetadata && Date.now() - cachedMiddlewareMetadata.loadedAt < MIDDLEWARE_METADATA_CACHE_TTL_MS) {
        return {
            allowedIps: cachedMiddlewareMetadata.allowedIps,
            embeddingAllowed: cachedMiddlewareMetadata.embeddingAllowed,
            serverVisibility: cachedMiddlewareMetadata.serverVisibility,
        };
    }

    let allowedIps: string | null = null;
    let embeddingAllowed: string | null = null;
    let serverVisibility: string | null = null;

    try {
        const { data } = await supabase
            .from(`${tablePrefix}Metadata`)
            .select('key, value')
            .in('key', MIDDLEWARE_METADATA_KEYS);

        if (Array.isArray(data)) {
            for (const row of data) {
                const key = row?.key;
                const value = row?.value;

                if (key === 'RESTRICT_IP' && typeof value === 'string' && value !== '') {
                    allowedIps = value;
                }
                if (key === 'IS_EMBEDDING_ALLOWED' && typeof value === 'string') {
                    embeddingAllowed = value;
                }
                if (key === SERVER_VISIBILITY_METADATA_KEY && typeof value === 'string') {
                    serverVisibility = value;
                }
            }
        }
    } catch (error) {
        console.error('Error fetching metadata in middleware:', error);
    }

    cachedMiddlewareMetadataByTablePrefix.set(normalizedTablePrefix, {
        allowedIps,
        embeddingAllowed,
        loadedAt: Date.now(),
        serverVisibility,
    });

    return {
        allowedIps,
        embeddingAllowed,
        serverVisibility,
    };
}

/**
 * Parses boolean metadata values, falling back when the stored value is missing or unrecognized.
 *
 * @param raw - Raw metadata text.
 * @param fallback - Value used when the metadata does not contain a usable boolean.
 * @returns Parsed boolean setting.
 *
 * @private function of createMiddlewareRequestContext
 */
function parseBooleanMetadataValue(raw: string | null | undefined, fallback: boolean): boolean {
    if (!raw) {
        return fallback;
    }

    const normalized = raw.trim().toLowerCase();

    if (['true', '1', 'yes'].includes(normalized)) {
        return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
        return false;
    }

    return fallback;
}
