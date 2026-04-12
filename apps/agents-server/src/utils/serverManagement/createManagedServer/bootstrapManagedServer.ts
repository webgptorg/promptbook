import { Client } from 'pg';
import { spaceTrim } from 'spacetrim';
import { ConflictError } from '../../../../../../src/errors/ConflictError';
import {
    acquireMigrationExecutionLock,
    releaseMigrationExecutionLock,
} from '../../../database/acquireMigrationExecutionLock';
import { scheduleDefaultFederatedAgentsSync } from '../../defaultFederatedAgents/scheduleDefaultFederatedAgentsSync';
import { createServerPublicUrl, invalidateRegisteredServersCache } from '../../serverRegistry';
import type { CreateServerResult } from '../createManagedServer';
import { resolveManagedServerConnectionString } from '../resolveManagedServerConnectionString';
import { applyManagedServerMigrations } from './applyManagedServerMigrations';
import { createFailedServerResult } from './createFailedServerResult';
import { createSqlRecorder } from './createSqlRecorder';
import { insertManagedServerRegistryRow } from './insertManagedServerRegistryRow';
import type { NormalizedCreateServerInput } from './normalizeCreateServerInput';
import { seedServerDefaultAgents } from './seedServerDefaultAgents';
import { seedServerMetadata } from './seedServerMetadata';
import { seedServerUsers } from './seedServerUsers';

/**
 * Executes the transactional bootstrap for one normalized managed server.
 *
 * @param input - Validated bootstrap payload.
 * @returns Successful create result.
 *
 * @private function of createManagedServer
 */
export async function bootstrapManagedServer(input: NormalizedCreateServerInput): Promise<CreateServerResult> {
    const client = new Client({
        connectionString: resolveManagedServerConnectionString('create a server'),
        ssl: { rejectUnauthorized: false },
    });
    const sqlRecorder = createSqlRecorder(input.identifier);
    const migrationLogger = createSilentMigrationLogger();
    let hasMigrationLock = false;

    try {
        await client.connect();
        await acquireMigrationExecutionLock(client, migrationLogger);
        hasMigrationLock = true;

        sqlRecorder.addStatement('BEGIN');
        await client.query('BEGIN');

        const server = await insertManagedServerRegistryRow(client, input, sqlRecorder);
        await applyManagedServerMigrations(client, input, sqlRecorder, migrationLogger);
        await seedServerUsers(client, input, sqlRecorder);
        await seedServerMetadata(client, input, sqlRecorder);
        await seedServerDefaultAgents(client, input, sqlRecorder);

        await client.query('COMMIT');
        sqlRecorder.addStatement('COMMIT');

        invalidateRegisteredServersCache();
        scheduleDefaultFederatedAgentsSync({
            tablePrefix: server.tablePrefix,
            localServerUrl: createServerPublicUrl(server.domain).href,
        });

        return {
            ok: true,
            server,
            publicUrl: createServerPublicUrl(server.domain).href,
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore rollback failures so the original error stays visible.
        }

        return createFailedServerResult(normalizeBootstrapTransactionError(error), sqlRecorder.render(), input.identifier);
    } finally {
        if (hasMigrationLock) {
            await releaseMigrationExecutionLock(client, migrationLogger);
        }

        await client.end();
    }
}

/**
 * Creates a silent logger compatible with the migration helper contract.
 *
 * @returns Logger that discards informational output.
 */
function createSilentMigrationLogger(): Pick<Console, 'error' | 'info' | 'warn'> {
    return {
        error: console.error.bind(console),
        info: () => undefined,
        warn: console.warn.bind(console),
    };
}

/**
 * Normalizes raw PostgreSQL bootstrap errors into branded domain errors.
 *
 * @param error - Unknown transaction failure.
 * @returns Branded domain error.
 */
function normalizeBootstrapTransactionError(error: unknown): unknown {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        return new ConflictError(
            spaceTrim(`
                Failed to create the server because one of its unique fields already exists.
            `),
        );
    }

    return error;
}
