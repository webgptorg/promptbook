import { spaceTrim } from 'spacetrim';
import { ConflictError } from '../../../../../src/errors/ConflictError';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import type { ServerEnvironment, ServerRecord } from '../serverRegistry';
import {
    getServerRegistryClient,
    invalidateRegisteredServersCache,
    parseServerRecord,
} from '../serverRegistry';
import { ManagedServerInputNormalizer } from './ManagedServerInputNormalizer';
import { SERVER_REGISTRY_TABLE_NAME } from './SERVER_REGISTRY_TABLE_NAME';

/**
 * Editable `_Server` fields exposed by the admin UI.
 */
export type UpdateServerInput = {
    /**
     * Registered server id.
     */
    readonly id: number;

    /**
     * Friendly unique server name.
     */
    readonly name: string;

    /**
     * Environment group used by migrations and operations.
     */
    readonly environment: ServerEnvironment;

    /**
     * Public domain assigned to the server.
     */
    readonly domain: string;

    /**
     * Prefix used by the server-specific tables.
     */
    readonly tablePrefix: string;
};

/**
 * Updates editable fields of one registered server.
 *
 * @param input - Updated `_Server` values.
 * @returns Updated normalized server row.
 */
export async function updateManagedServer(input: UpdateServerInput): Promise<ServerRecord> {
    const normalizedInput = normalizeUpdateServerInput(input);
    const supabase = getServerRegistryClient();
    const { data, error } = await supabase
        .from(SERVER_REGISTRY_TABLE_NAME)
        .update({
            name: normalizedInput.name,
            environment: normalizedInput.environment,
            domain: normalizedInput.domain,
            tablePrefix: normalizedInput.tablePrefix,
            updatedAt: new Date().toISOString(),
        })
        .eq('id', normalizedInput.id)
        .select('id,name,environment,domain,tablePrefix,createdAt,updatedAt')
        .single();

    if (error) {
        throw normalizeRegistryWriteError(error, 'update');
    }

    if (!data) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to update server \`${normalizedInput.name}\` because the registry row was not returned.
            `),
        );
    }

    invalidateRegisteredServersCache();
    return parseServerRecord(data as Record<string, unknown>);
}

/**
 * Normalizes and validates editable `_Server` fields.
 *
 * @param input - Raw update payload.
 * @returns Validated editable fields.
 *
 * @private function of serverManagement
 */
export function normalizeUpdateServerInput(input: UpdateServerInput): UpdateServerInput {
    if (!Number.isFinite(input.id)) {
        throw new DatabaseError(
            spaceTrim(`
                Field \`id\` must be a valid number.
            `),
        );
    }

    return {
        id: input.id,
        name: ManagedServerInputNormalizer.normalizeNonEmptyText(input.name, 'name'),
        environment: ManagedServerInputNormalizer.normalizeServerEnvironment(input.environment),
        domain: ManagedServerInputNormalizer.normalizeRequiredServerDomain(input.domain),
        tablePrefix: ManagedServerInputNormalizer.validateServerTablePrefix(input.tablePrefix),
    };
}

/**
 * Normalizes a raw registry write error into a branded domain error.
 *
 * @param error - Unknown Supabase/PostgREST error.
 * @param action - Human-readable operation name.
 * @returns Branded domain error.
 *
 * @private function of serverManagement
 */
export function normalizeRegistryWriteError(
    error: { code?: string; message?: string } | null | undefined,
    action: string,
): Error {
    if (error?.code === '23505') {
        return new ConflictError(
            spaceTrim(`
                Failed to ${action} the registered server because one of its unique fields already exists.

                ${error.message || 'Unique constraint violation.'}
            `),
        );
    }

    return new DatabaseError(
        spaceTrim(`
            Failed to ${action} the registered server.

            ${error?.message || 'Unknown database error.'}
        `),
    );
}
