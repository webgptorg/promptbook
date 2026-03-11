import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import spaceTrim from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';

/**
 * Supported `_Server.environment` values.
 */
export const SERVER_ENVIRONMENT = {
    PRODUCTION: 'PRODUCTION',
    PREVIEW: 'PREVIEW',
} as const;

/**
 * Environment category used to group registered servers.
 */
export type ServerEnvironment = (typeof SERVER_ENVIRONMENT)[keyof typeof SERVER_ENVIRONMENT];

/**
 * One normalized row from the global `_Server` registry table.
 */
export type ServerRecord = {
    /**
     * Numeric database identifier.
     */
    readonly id: number;
    /**
     * Stable unique server name.
     */
    readonly name: string;
    /**
     * Environment group used by migrations and operations.
     */
    readonly environment: ServerEnvironment;
    /**
     * Public Vercel domain assigned to the server.
     */
    readonly domain: string;
    /**
     * Prefix used by the server-specific tables.
     */
    readonly tablePrefix: string;
    /**
     * Database creation timestamp.
     */
    readonly createdAt: string;
    /**
     * Database update timestamp.
     */
    readonly updatedAt: string;
};

/**
 * Columns loaded from `_Server`.
 */
const SERVER_REGISTRY_SELECT = 'id,name,environment,domain,tablePrefix,createdAt,updatedAt';

/**
 * Global source-of-truth table for server routing and migration targeting.
 */
const SERVER_REGISTRY_TABLE_NAME = '_Server';

/**
 * In-memory cache TTL for repeated registry lookups inside one runtime process.
 */
const SERVER_REGISTRY_CACHE_TTL_MS = 10_000;

/**
 * Cached service-role Supabase client used for `_Server` lookups.
 */
let cachedServerRegistryClient: SupabaseClient | null = null;

/**
 * Shared server-registry lookup cache.
 */
let cachedServerRegistry: {
    readonly loadedAt: number;
    readonly serversPromise: Promise<Array<ServerRecord>>;
} | null = null;

/**
 * Loads normalized server rows from the global `_Server` registry table.
 *
 * @param supabase - Supabase client with read access to `_Server`.
 * @returns Registered servers ordered by name.
 */
export async function listRegisteredServers(supabase: Pick<SupabaseClient, 'from'>): Promise<Array<ServerRecord>> {
    const { data, error } = await supabase
        .from(SERVER_REGISTRY_TABLE_NAME)
        .select(SERVER_REGISTRY_SELECT)
        .order('name', { ascending: true });

    if (error) {
        if (isMissingServerRegistryError(error)) {
            return [];
        }

        throw new DatabaseError(
            spaceTrim(`
                Failed to load server registry from \`${SERVER_REGISTRY_TABLE_NAME}\`.

                ${String(error.message || error)}
            `),
        );
    }

    return (Array.isArray(data) ? data : []).map((row, index) =>
        parseServerRecord(row as Record<string, unknown>, `row ${index + 1}`),
    );
}

/**
 * Loads registered servers through the shared service-role client with a short cache.
 *
 * @param options - Cache controls.
 * @returns Registered servers ordered by name.
 */
export async function listRegisteredServersUsingServiceRole(options?: {
    readonly forceRefresh?: boolean;
}): Promise<Array<ServerRecord>> {
    const shouldReuseCache =
        !options?.forceRefresh &&
        cachedServerRegistry !== null &&
        Date.now() - cachedServerRegistry.loadedAt < SERVER_REGISTRY_CACHE_TTL_MS;

    if (shouldReuseCache) {
        return cachedServerRegistry!.serversPromise;
    }

    const serversPromise = listRegisteredServers(getServerRegistryClient());
    cachedServerRegistry = {
        loadedAt: Date.now(),
        serversPromise,
    };

    try {
        return await serversPromise;
    } catch (error) {
        if (cachedServerRegistry?.serversPromise === serversPromise) {
            cachedServerRegistry = null;
        }
        throw error;
    }
}

/**
 * Finds one registered server by incoming host header.
 *
 * Matching is done against normalized hostnames so ports and protocols are ignored.
 *
 * @param host - Raw request host.
 * @param servers - Registered server rows.
 * @returns Matching server or `null`.
 */
export function resolveRegisteredServerByHost(
    host: string | null | undefined,
    servers: ReadonlyArray<ServerRecord>,
): ServerRecord | null {
    if (!host) {
        return null;
    }

    const normalizedHost = normalizeServerDomain(host);
    if (!normalizedHost) {
        return null;
    }

    return servers.find((server) => normalizeServerDomain(server.domain) === normalizedHost) ?? null;
}

/**
 * Normalizes one raw `_Server` row and validates required fields.
 *
 * @param rawRow - Raw database row.
 * @param label - Human-readable row label for diagnostics.
 * @returns Normalized server row.
 */
export function parseServerRecord(rawRow: Record<string, unknown>, label = 'row'): ServerRecord {
    const rawEnvironment = typeof rawRow.environment === 'string' ? rawRow.environment.trim().toUpperCase() : '';
    if (!isServerEnvironment(rawEnvironment)) {
        throw new DatabaseError(
            spaceTrim(`
                Invalid \`${SERVER_REGISTRY_TABLE_NAME}\` ${label}.

                Field \`environment\` must be one of \`${SERVER_ENVIRONMENT.PRODUCTION}\` or \`${SERVER_ENVIRONMENT.PREVIEW}\`.
            `),
        );
    }

    const domain = typeof rawRow.domain === 'string' ? rawRow.domain.trim().toLowerCase() : '';
    const normalizedDomain = normalizeServerDomain(domain);
    if (!normalizedDomain) {
        throw new DatabaseError(
            spaceTrim(`
                Invalid \`${SERVER_REGISTRY_TABLE_NAME}\` ${label}.

                Field \`domain\` must contain a valid host or URL-like domain string.
            `),
        );
    }

    const name = typeof rawRow.name === 'string' ? rawRow.name.trim() : '';
    const tablePrefixValue = rawRow.tablePrefix;
    const hasTablePrefix = typeof tablePrefixValue === 'string';
    const tablePrefix = typeof tablePrefixValue === 'string' ? tablePrefixValue.trim() : '';
    const createdAt = typeof rawRow.createdAt === 'string' ? rawRow.createdAt : '';
    const updatedAt = typeof rawRow.updatedAt === 'string' ? rawRow.updatedAt : '';
    const id = typeof rawRow.id === 'number' ? rawRow.id : Number(rawRow.id);

    if (!name || !hasTablePrefix /*|| !createdAt || !updatedAt ||*/ || !Number.isFinite(id)) {
        throw new DatabaseError(
            spaceTrim(`
                Invalid \`${SERVER_REGISTRY_TABLE_NAME}\` ${label}.

                Fields \`id\`, \`name\`, \`tablePrefix\`, \`createdAt\`, and \`updatedAt\` are required.

                ${
                    !Number.isFinite(id)
                        ? '❌ Field `id` is missing or not a valid number.'
                        : `✔ Field \`id\` is valid "${id}".`
                }
                ${!name ? '❌ Field `name` is missing or empty.' : `✔ Field \`name\` is valid "${name}".`}
                ${
                    !hasTablePrefix
                        ? '❌ Field `tablePrefix` is missing or empty.'
                        : `✔ Field \`tablePrefix\` is valid "${tablePrefix}".`
                }
                ${
                    !createdAt
                        ? '❌ Field `createdAt` is missing or empty.'
                        : `✔ Field \`createdAt\` is valid "${createdAt}".`
                }
                ${
                    !updatedAt
                        ? '❌ Field `updatedAt` is missing or empty.'
                        : `✔ Field \`updatedAt\` is valid "${updatedAt}".`
                }


            `),
        );
    }

    return {
        id,
        name,
        environment: rawEnvironment,
        domain: normalizedDomain,
        tablePrefix,
        createdAt,
        updatedAt,
    };
}

/**
 * Checks whether a string is a valid `ServerEnvironment`.
 *
 * @param value - Raw value from the database.
 * @returns `true` when the value is supported.
 */
export function isServerEnvironment(value: string): value is ServerEnvironment {
    return value === SERVER_ENVIRONMENT.PRODUCTION || value === SERVER_ENVIRONMENT.PREVIEW;
}

/**
 * Creates the shared service-role Supabase client used by registry helpers.
 *
 * @returns Shared untyped Supabase client.
 */
function getServerRegistryClient(): SupabaseClient {
    if (cachedServerRegistryClient) {
        return cachedServerRegistryClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot read \`${SERVER_REGISTRY_TABLE_NAME}\` because Supabase environment variables are missing.

                Expected \`NEXT_PUBLIC_SUPABASE_URL\` and \`SUPABASE_SERVICE_ROLE_KEY\` (or \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`).
            `),
        );
    }

    cachedServerRegistryClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return cachedServerRegistryClient;
}

/**
 * Detects `_Server`-table-missing errors returned by Supabase/PostgREST.
 *
 * @param error - Unknown query error.
 * @returns `true` when `_Server` does not exist yet.
 */
function isMissingServerRegistryError(error: { code?: string; message?: string } | null | undefined): boolean {
    if (!error) {
        return false;
    }

    return error.code === '42P01' || error.code === 'PGRST205';
}

/**
 * Normalizes one server-domain value while preserving an explicit port for local development.
 *
 * @param rawDomain - Raw database or request-host value.
 * @returns Normalized host or `host:port`, or `null` when invalid.
 */
function normalizeServerDomain(rawDomain: string): string | null {
    const trimmedDomain = rawDomain.trim();
    if (!trimmedDomain) {
        return null;
    }

    const candidateUrl = hasHttpProtocol(trimmedDomain) ? trimmedDomain : `https://${trimmedDomain}`;

    try {
        const parsedUrl = new URL(candidateUrl);
        const normalizedHostname = parsedUrl.hostname.trim().toLowerCase();
        if (!normalizedHostname) {
            return null;
        }

        if (parsedUrl.port && !isDefaultPortForProtocol(parsedUrl.protocol, parsedUrl.port)) {
            return `${normalizedHostname}:${parsedUrl.port}`;
        }

        return normalizedHostname;
    } catch {
        return null;
    }
}

/**
 * Checks whether a value already includes an HTTP(S) protocol.
 *
 * @param value - Raw value to inspect.
 * @returns `true` when the value starts with `http://` or `https://`.
 */
function hasHttpProtocol(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
}

/**
 * Checks whether a port is implicit for the given protocol and can be omitted.
 *
 * @param protocol - Parsed URL protocol.
 * @param port - Parsed URL port.
 * @returns `true` when the port is the protocol default.
 */
function isDefaultPortForProtocol(protocol: string, port: string): boolean {
    return (protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443');
}
