import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import spaceTrim from 'spacetrim';
import { AuthenticationError } from '../../../../src/errors/AuthenticationError';
import { ConflictError } from '../../../../src/errors/ConflictError';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import { NotAllowed } from '../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../src/errors/NotFoundError';
import { SERVER_LANGUAGE_METADATA_KEY } from '../languages/ServerLanguageRegistry';
import { acquireMigrationExecutionLock, releaseMigrationExecutionLock } from '../database/acquireMigrationExecutionLock';
import { applyPendingMigrationsForPrefix } from '../database/migratePrefix';
import { metadataDefaults } from '../database/metadataDefaults';
import {
    DATABASE_MIGRATION_APPLIED_BY,
    resolveDatabaseMigrationConnectionStringFromEnvironment,
    runDatabaseMigrations,
} from '../database/runDatabaseMigrations';
import { readMigrationFiles, resolveMigrationsDirectory } from '../database/resolveMigrationsDirectory';
import { getPasswordValidationMessage, hashPassword } from './auth';
import { buildServerTablePrefix } from './buildServerTablePrefix';
import {
    getServerRegistryClient,
    invalidateRegisteredServersCache,
    listRegisteredServersUsingServiceRole,
} from './serverRegistry';
import {
    createServerPublicUrl,
    isServerEnvironment,
    normalizeServerDomain,
    parseServerRecord,
    type ServerEnvironment,
    type ServerRecord,
} from './serverRegistry';

/**
 * Table name of the global server registry.
 */
const SERVER_REGISTRY_TABLE_NAME = '_Server';

/**
 * Table-prefix pattern accepted when editing or creating registered servers.
 */
const SERVER_TABLE_PREFIX_PATTERN = /^[A-Za-z][A-Za-z0-9_]*_$/;

/**
 * Metadata keys seeded from the create-server wizard feature flags.
 */
const FEATURE_FLAG_METADATA_KEY_BY_FIELD = {
    isFeedbackEnabled: 'IS_FEEDBACK_ENABLED',
    isFileAttachmentsEnabled: 'IS_FILE_ATTACHEMENTS_ENABLED',
    isExperimentalPwaAppEnabled: 'IS_EXPERIMENTAL_PWA_APP_ENABLED',
    isFooterShown: 'IS_FOOTER_SHOWN',
} as const;

/**
 * User row requested by the create-server wizard.
 */
export type ServerSeedUserInput = {
    /**
     * Username that will be created inside the spawned server.
     */
    readonly username: string;
    /**
     * Plain-text password for the new user.
     */
    readonly password: string;
    /**
     * Whether the user should have admin access inside the spawned server.
     */
    readonly isAdmin?: boolean;
};

/**
 * Initial metadata choices collected by the create-server wizard.
 */
export type CreateServerInitialSettings = {
    /**
     * Default UI language for the new server.
     */
    readonly language: string;
    /**
     * Optional homepage markdown message.
     */
    readonly homepageMessage: string;
    /**
     * Whether chat feedback should be enabled.
     */
    readonly isFeedbackEnabled: boolean;
    /**
     * Whether chat file attachments should be enabled.
     */
    readonly isFileAttachmentsEnabled: boolean;
    /**
     * Whether the install-as-app option should be enabled.
     */
    readonly isExperimentalPwaAppEnabled: boolean;
    /**
     * Whether the footer should be shown.
     */
    readonly isFooterShown: boolean;
};

/**
 * Payload accepted by the create-server bootstrap workflow.
 */
export type CreateServerInput = {
    /**
     * Friendly name stored in `_Server.name` and `SERVER_NAME`.
     */
    readonly name: string;
    /**
     * Stable slug used to derive the default table prefix.
     */
    readonly identifier: string;
    /**
     * Environment group used by migrations and operations.
     */
    readonly environment: ServerEnvironment;
    /**
     * Public domain assigned to the new server.
     */
    readonly domain: string;
    /**
     * Prefix used for the new server tables.
     */
    readonly tablePrefix: string;
    /**
     * Optional uploaded server icon URL.
     */
    readonly iconUrl?: string | null;
    /**
     * Mandatory first admin account created inside the new server.
     */
    readonly adminUser: ServerSeedUserInput;
    /**
     * Optional extra users created during bootstrap.
     */
    readonly additionalUsers?: ReadonlyArray<ServerSeedUserInput>;
    /**
     * Initial metadata values for the new server.
     */
    readonly initialSettings: CreateServerInitialSettings;
};

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
 * Successful create-server result returned to the API layer.
 */
export type CreateServerSuccess = {
    /**
     * Newly created server row.
     */
    readonly server: ServerRecord;
    /**
     * Public URL for opening the new server.
     */
    readonly publicUrl: string;
};

/**
 * Failed create-server result returned to the API layer.
 */
export type CreateServerFailure = {
    /**
     * HTTP-style status code suitable for the API response.
     */
    readonly status: number;
    /**
     * User-facing error message.
     */
    readonly message: string;
    /**
     * SQL script representing the attempted bootstrap transaction.
     */
    readonly sqlDump: string | null;
    /**
     * Suggested filename for downloading the SQL dump.
     */
    readonly sqlFilename: string | null;
};

/**
 * Result of attempting to create a new server.
 */
export type CreateServerResult =
    | ({
          readonly ok: true;
      } & CreateServerSuccess)
    | ({
          readonly ok: false;
      } & CreateServerFailure);

/**
 * Summary returned after running migrations for a single server.
 */
export type RegisteredServerMigrationResult = {
    /**
     * Migrated server row.
     */
    readonly server: ServerRecord;
    /**
     * Number of newly applied migration files.
     */
    readonly appliedCount: number;
    /**
     * Total number of migration files discovered on disk.
     */
    readonly totalMigrationFiles: number;
};

/**
 * Normalized user row inserted during bootstrap.
 */
type NormalizedServerSeedUser = {
    /**
     * Username stored in the spawned server.
     */
    readonly username: string;
    /**
     * Plain-text password validated before hashing.
     */
    readonly password: string;
    /**
     * Whether the user should be created as an admin.
     */
    readonly isAdmin: boolean;
};

/**
 * One metadata row inserted during server bootstrap.
 */
type ServerMetadataSeedEntry = {
    /**
     * Metadata key.
     */
    readonly key: string;
    /**
     * Metadata value.
     */
    readonly value: string;
    /**
     * Optional metadata note copied from defaults.
     */
    readonly note: string | null;
};

/**
 * Normalized create-server payload ready for bootstrap.
 */
type NormalizedCreateServerInput = {
    /**
     * Friendly unique server name.
     */
    readonly name: string;
    /**
     * Stable identifier used for the derived table prefix.
     */
    readonly identifier: string;
    /**
     * Environment group used by migrations and operations.
     */
    readonly environment: ServerEnvironment;
    /**
     * Normalized public domain.
     */
    readonly domain: string;
    /**
     * Validated server table prefix.
     */
    readonly tablePrefix: string;
    /**
     * Optional uploaded server icon URL.
     */
    readonly iconUrl: string | null;
    /**
     * Users inserted during bootstrap.
     */
    readonly users: ReadonlyArray<NormalizedServerSeedUser>;
    /**
     * Initial metadata rows inserted during bootstrap.
     */
    readonly metadataEntries: ReadonlyArray<ServerMetadataSeedEntry>;
};

/**
 * Mutable SQL recorder used to capture a downloadable bootstrap script.
 */
type SqlRecorder = {
    /**
     * Adds one SQL statement to the dump.
     *
     * @param statement - SQL statement body.
     */
    readonly addStatement: (statement: string) => void;
    /**
     * Renders the final SQL dump string.
     *
     * @returns SQL dump text.
     */
    readonly render: () => string;
};

/**
 * Loads all registered servers directly from the shared registry cache.
 *
 * @returns Registered servers ordered by name.
 */
export async function listManagedServers(): Promise<ReadonlyArray<ServerRecord>> {
    return listRegisteredServersUsingServiceRole({ forceRefresh: true });
}

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
 * Runs pending migrations for the selected registered server.
 *
 * @param serverId - Registry id of the server to migrate.
 * @returns Migration summary for the selected server.
 */
export async function migrateManagedServer(serverId: number): Promise<RegisteredServerMigrationResult> {
    const server = await getManagedServerById(serverId);
    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();

    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot run server migrations because \`POSTGRES_URL\` or \`DATABASE_URL\` is missing.
            `),
        );
    }

    const migrationResult = await runDatabaseMigrations({
        prefixes: [server.tablePrefix],
        registeredServers: [server],
        connectionString,
        appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
        onlyTargets: [server.tablePrefix],
    });

    invalidateRegisteredServersCache();

    return {
        server,
        appliedCount: migrationResult.perPrefix[0]?.appliedCount ?? 0,
        totalMigrationFiles: migrationResult.totalMigrationFiles,
    };
}

/**
 * Deletes the current registered server from `_Server` without touching prefixed tables.
 *
 * @param options - Delete request scoped to the currently active server.
 * @returns Next server id that should become active, or `null` when none remain.
 */
export async function deleteManagedServer(options: {
    readonly serverId: number;
    readonly currentServerId: number | null;
}): Promise<number | null> {
    if (options.currentServerId === null || options.serverId !== options.currentServerId) {
        throw new NotAllowed(
            spaceTrim(`
                You can delete only the currently selected server.
            `),
        );
    }

    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();
    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot delete a registered server because \`POSTGRES_URL\` or \`DATABASE_URL\` is missing.
            `),
        );
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        await client.query('BEGIN');
        const deleteResult = await client.query(`DELETE FROM "${SERVER_REGISTRY_TABLE_NAME}" WHERE "id" = $1`, [
            options.serverId,
        ]);

        if ((deleteResult.rowCount ?? 0) === 0) {
            throw new NotFoundError(
                spaceTrim(`
                    Server with id \`${options.serverId}\` was not found in \`${SERVER_REGISTRY_TABLE_NAME}\`.
                `),
            );
        }

        const remainingRows = await client.query<Record<string, unknown>>(
            `
                SELECT "id", "name", "environment", "domain", "tablePrefix", "createdAt", "updatedAt"
                FROM "${SERVER_REGISTRY_TABLE_NAME}"
                ORDER BY "name" ASC
                LIMIT 1
            `,
        );

        await client.query('COMMIT');
        invalidateRegisteredServersCache();

        const nextServerRow = remainingRows.rows[0];
        return nextServerRow ? parseServerRecord(nextServerRow).id : null;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore rollback failures so the original error stays visible.
        }
        throw new DatabaseError(
            spaceTrim(`
                Failed to delete the current server from \`${SERVER_REGISTRY_TABLE_NAME}\`.

                ${error instanceof Error ? error.message : String(error)}
            `),
        );
    } finally {
        await client.end();
    }
}

/**
 * Loads one registered server by its id.
 *
 * @param serverId - Registry id to resolve.
 * @returns Matching server record.
 */
export async function getManagedServerById(serverId: number): Promise<ServerRecord> {
    const servers = await listRegisteredServersUsingServiceRole({ forceRefresh: true });
    const server = servers.find((candidate) => candidate.id === serverId);

    if (!server) {
        throw new NotFoundError(
            spaceTrim(`
                Server with id \`${serverId}\` was not found in \`${SERVER_REGISTRY_TABLE_NAME}\`.
            `),
        );
    }

    return server;
}

/**
 * Ensures the given request is performed by the environment-backed super-admin.
 *
 * @param isGlobalAdmin - Resolved super-admin flag.
 */
export function assertGlobalAdminAccess(isGlobalAdmin: boolean): void {
    if (!isGlobalAdmin) {
        throw new AuthenticationError(
            spaceTrim(`
                This action is restricted to the environment-backed global admin.
            `),
        );
    }
}

/**
 * Parses one route-level managed-server identifier.
 *
 * @param rawServerId - Raw dynamic route segment.
 * @returns Numeric server identifier.
 */
export function parseManagedServerId(rawServerId: string): number {
    const parsedServerId = Number(rawServerId);
    if (!Number.isFinite(parsedServerId)) {
        throw new DatabaseError(
            spaceTrim(`
                Field \`serverId\` must be a valid number.
            `),
        );
    }

    return parsedServerId;
}

/**
 * Creates a new registered server, runs migrations for its prefix, and seeds users/metadata in one transaction.
 *
 * @param input - Create-server payload from the wizard.
 * @returns Success result or a failure payload containing the attempted SQL dump.
 */
export async function createManagedServer(input: CreateServerInput): Promise<CreateServerResult> {
    let normalizedInput: NormalizedCreateServerInput;

    try {
        normalizedInput = await normalizeCreateServerInput(input);
    } catch (error) {
        return createFailedServerResult(error, null, null);
    }

    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();
    if (!connectionString) {
        return createFailedServerResult(
            new DatabaseError(
                spaceTrim(`
                    Cannot create a server because \`POSTGRES_URL\` or \`DATABASE_URL\` is missing.
                `),
            ),
            null,
            normalizedInput.identifier,
        );
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });
    const sqlRecorder = createSqlRecorder(normalizedInput.identifier);
    const migrationLogger = createSilentMigrationLogger();
    let hasMigrationLock = false;

    try {
        await client.connect();
        await acquireMigrationExecutionLock(client, migrationLogger);
        hasMigrationLock = true;

        sqlRecorder.addStatement('BEGIN');
        await client.query('BEGIN');

        const insertRegistryResult = await client.query<Record<string, unknown>>(
            `
                INSERT INTO "${SERVER_REGISTRY_TABLE_NAME}" ("name", "environment", "domain", "tablePrefix")
                VALUES ($1, $2, $3, $4)
                RETURNING "id", "name", "environment", "domain", "tablePrefix", "createdAt", "updatedAt"
            `,
            [normalizedInput.name, normalizedInput.environment, normalizedInput.domain, normalizedInput.tablePrefix],
        );
        sqlRecorder.addStatement(
            createInsertStatement(SERVER_REGISTRY_TABLE_NAME, {
                name: normalizedInput.name,
                environment: normalizedInput.environment,
                domain: normalizedInput.domain,
                tablePrefix: normalizedInput.tablePrefix,
            }),
        );

        const serverRow = insertRegistryResult.rows[0];
        if (!serverRow) {
            throw new DatabaseError(
                spaceTrim(`
                    Failed to insert a row into \`${SERVER_REGISTRY_TABLE_NAME}\` for server \`${normalizedInput.name}\`.
                `),
            );
        }
        const server = parseServerRecord(serverRow);

        const migrationsDirectory = resolveMigrationsDirectory();
        const migrationFiles = readMigrationFiles(migrationsDirectory);
        for (const migrationFile of migrationFiles) {
            const rawMigrationSql = await readFile(`${migrationsDirectory}/${migrationFile}`, 'utf-8');
            sqlRecorder.addStatement(rawMigrationSql.replace(/prefix_/g, normalizedInput.tablePrefix));
            sqlRecorder.addStatement(
                createInsertStatement(`${normalizedInput.tablePrefix}Migrations`, {
                    filename: migrationFile,
                    appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
                }),
            );
        }

        await applyPendingMigrationsForPrefix({
            prefix: normalizedInput.tablePrefix,
            appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
            manualAppliedByDefault: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
            client,
            logger: migrationLogger,
            migrationFiles,
            migrationsDirectory,
            logSqlStatements: false,
        });

        await seedServerUsers(client, normalizedInput, sqlRecorder);
        await seedServerMetadata(client, normalizedInput, sqlRecorder);

        await client.query('COMMIT');
        sqlRecorder.addStatement('COMMIT');

        invalidateRegisteredServersCache();

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

        return createFailedServerResult(
            normalizeBootstrapTransactionError(error),
            sqlRecorder.render(),
            normalizedInput.identifier,
        );
    } finally {
        if (hasMigrationLock) {
            await releaseMigrationExecutionLock(client, migrationLogger);
        }
        await client.end();
    }
}

/**
 * Normalizes and validates the create-server payload.
 *
 * @param input - Raw API payload.
 * @returns Validated payload ready for transactional bootstrap.
 */
async function normalizeCreateServerInput(input: CreateServerInput): Promise<NormalizedCreateServerInput> {
    const name = normalizeNonEmptyText(input.name, 'name');
    const identifier = normalizeServerIdentifier(input.identifier);
    const tablePrefix = validateServerTablePrefix(input.tablePrefix);
    const expectedTablePrefix = buildServerTablePrefix(identifier);

    if (tablePrefix !== expectedTablePrefix) {
        throw new DatabaseError(
            spaceTrim(`
                Table prefix \`${tablePrefix}\` does not match identifier \`${identifier}\`.

                Expected \`${expectedTablePrefix}\`.
            `),
        );
    }

    const environment = normalizeServerEnvironment(input.environment);
    const domain = normalizeRequiredServerDomain(input.domain);
    const iconUrl = normalizeOptionalText(input.iconUrl);
    const language = normalizeNonEmptyText(input.initialSettings.language, 'initialSettings.language');
    const homepageMessage = normalizeOptionalText(input.initialSettings.homepageMessage) || '';
    const adminUser = normalizeSeedUser(input.adminUser, 'admin user', true);
    const additionalUsers = (input.additionalUsers || []).map((user, index) =>
        normalizeSeedUser(user, `additional user ${index + 1}`, false),
    );
    const users = [adminUser, ...additionalUsers];

    assertUniqueSeedUsernames(users);

    const metadataEntries = buildServerMetadataSeedEntries({
        name,
        language,
        homepageMessage,
        iconUrl,
        initialSettings: input.initialSettings,
    });

    return {
        name,
        identifier,
        environment,
        domain,
        tablePrefix,
        iconUrl,
        users,
        metadataEntries,
    };
}

/**
 * Normalizes and validates editable `_Server` fields.
 *
 * @param input - Raw update payload.
 * @returns Validated editable fields.
 */
function normalizeUpdateServerInput(input: UpdateServerInput): UpdateServerInput {
    if (!Number.isFinite(input.id)) {
        throw new DatabaseError(
            spaceTrim(`
                Field \`id\` must be a valid number.
            `),
        );
    }

    return {
        id: input.id,
        name: normalizeNonEmptyText(input.name, 'name'),
        environment: normalizeServerEnvironment(input.environment),
        domain: normalizeRequiredServerDomain(input.domain),
        tablePrefix: validateServerTablePrefix(input.tablePrefix),
    };
}

/**
 * Builds metadata rows inserted during create-server bootstrap.
 *
 * @param options - Normalized metadata inputs from the wizard.
 * @returns Metadata seed rows.
 */
function buildServerMetadataSeedEntries(options: {
    readonly name: string;
    readonly language: string;
    readonly homepageMessage: string;
    readonly iconUrl: string | null;
    readonly initialSettings: CreateServerInitialSettings;
}): ReadonlyArray<ServerMetadataSeedEntry> {
    const entries: Array<ServerMetadataSeedEntry> = [
        createMetadataSeedEntry('SERVER_NAME', options.name),
        createMetadataSeedEntry(SERVER_LANGUAGE_METADATA_KEY, options.language),
    ];

    if (options.homepageMessage !== '') {
        entries.push(createMetadataSeedEntry('HOMEPAGE_MESSAGE', options.homepageMessage));
    }

    if (options.iconUrl) {
        entries.push(createMetadataSeedEntry('SERVER_LOGO_URL', options.iconUrl));
        entries.push(createMetadataSeedEntry('SERVER_FAVICON_URL', options.iconUrl));
    }

    for (const [fieldName, metadataKey] of Object.entries(FEATURE_FLAG_METADATA_KEY_BY_FIELD)) {
        const fieldValue = options.initialSettings[
            fieldName as keyof typeof FEATURE_FLAG_METADATA_KEY_BY_FIELD
        ];
        entries.push(createMetadataSeedEntry(metadataKey, fieldValue ? 'true' : 'false'));
    }

    return entries;
}

/**
 * Creates one metadata seed row while copying the default note when available.
 *
 * @param key - Metadata key to insert.
 * @param value - Metadata value to insert.
 * @returns Metadata seed entry.
 */
function createMetadataSeedEntry(key: string, value: string): ServerMetadataSeedEntry {
    const defaultEntry = metadataDefaults.find((candidate) => candidate.key === key);
    return {
        key,
        value,
        note: defaultEntry?.note ?? null,
    };
}

/**
 * Inserts server bootstrap users into the prefixed `User` table.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 */
async function seedServerUsers(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<void> {
    const userTableIdentifier = quoteIdentifier(`${input.tablePrefix}User`);

    for (const user of input.users) {
        const passwordHash = await hashPassword(user.password);
        await client.query(
            `
                INSERT INTO ${userTableIdentifier} ("username", "passwordHash", "isAdmin", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, now(), now())
            `,
            [user.username, passwordHash, user.isAdmin],
        );
        sqlRecorder.addStatement(
            createInsertStatement(`${input.tablePrefix}User`, {
                username: user.username,
                passwordHash,
                isAdmin: user.isAdmin,
            }),
        );
    }
}

/**
 * Inserts server bootstrap metadata into the prefixed `Metadata` table.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 */
async function seedServerMetadata(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<void> {
    const metadataTableIdentifier = quoteIdentifier(`${input.tablePrefix}Metadata`);

    for (const metadataEntry of input.metadataEntries) {
        await client.query(
            `
                INSERT INTO ${metadataTableIdentifier} ("key", "value", "note", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, now(), now())
            `,
            [metadataEntry.key, metadataEntry.value, metadataEntry.note],
        );
        sqlRecorder.addStatement(
            createInsertStatement(`${input.tablePrefix}Metadata`, {
                key: metadataEntry.key,
                value: metadataEntry.value,
                note: metadataEntry.note,
            }),
        );
    }
}

/**
 * Creates a stable failure payload for the create-server API.
 *
 * @param error - Original failure.
 * @param sqlDump - Optional SQL dump captured before the failure.
 * @param identifier - Optional server identifier used for the dump filename.
 * @returns Failure payload safe for the client.
 */
function createFailedServerResult(
    error: unknown,
    sqlDump: string | null,
    identifier: string | null,
): CreateServerResult {
    const passwordValidationMessage = getPasswordValidationMessage(error);
    const status = resolveManagedServerErrorStatus(error);
    const message =
        passwordValidationMessage ||
        (error instanceof Error ? error.message : 'An unexpected error occurred while creating the server.');

    return {
        ok: false,
        status,
        message,
        sqlDump,
        sqlFilename: sqlDump && identifier ? `create-server-${identifier}.sql` : null,
    };
}

/**
 * Creates a SQL recorder pre-populated with a descriptive transaction header.
 *
 * @param identifier - Server identifier used in comments and filenames.
 * @returns Mutable SQL recorder.
 */
function createSqlRecorder(identifier: string): SqlRecorder {
    const statements: Array<string> = [
        `-- Promptbook Agents Server bootstrap dump for \`${identifier}\``,
        '-- This script was captured from a failed create-server transaction.',
        '-- If you need help recovering the server manually, contact support@ptbk.io.',
    ];

    return {
        addStatement(statement) {
            const trimmedStatement = statement.trim();
            if (!trimmedStatement) {
                return;
            }

            statements.push(trimmedStatement.endsWith(';') ? trimmedStatement : `${trimmedStatement};`);
        },
        render() {
            return `${statements.join('\n\n')}\n`;
        },
    };
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
 * Normalizes a raw registry write error into a branded domain error.
 *
 * @param error - Unknown Supabase/PostgREST error.
 * @param action - Human-readable operation name.
 * @returns Branded domain error.
 */
function normalizeRegistryWriteError(error: { code?: string; message?: string } | null | undefined, action: string): Error {
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

/**
 * Maps branded server-management errors to API-friendly status codes.
 *
 * @param error - Unknown domain error.
 * @returns HTTP-style status code.
 */
export function resolveManagedServerErrorStatus(error: unknown): number {
    if (getPasswordValidationMessage(error)) {
        return 400;
    }
    if (error instanceof AuthenticationError) {
        return 401;
    }
    if (error instanceof NotFoundError) {
        return 404;
    }
    if (error instanceof NotAllowed) {
        return 403;
    }
    if (error instanceof ConflictError) {
        return 409;
    }
    if (error instanceof DatabaseError) {
        return 400;
    }
    return 500;
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

/**
 * Normalizes a required text field.
 *
 * @param value - Raw field value.
 * @param fieldName - Human-readable field name for diagnostics.
 * @returns Trimmed non-empty text.
 */
function normalizeNonEmptyText(value: string, fieldName: string): string {
    const normalizedValue = typeof value === 'string' ? value.trim() : '';
    if (normalizedValue === '') {
        throw new DatabaseError(
            spaceTrim(`
                Field \`${fieldName}\` is required.
            `),
        );
    }

    return normalizedValue;
}

/**
 * Normalizes an optional text field.
 *
 * @param value - Raw field value.
 * @returns Trimmed text or `null` when empty.
 */
function normalizeOptionalText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue === '' ? null : normalizedValue;
}

/**
 * Validates a create-server identifier.
 *
 * @param identifier - Raw identifier from the wizard.
 * @returns Normalized safe identifier.
 */
function normalizeServerIdentifier(identifier: string): string {
    const normalizedIdentifier = normalizeNonEmptyText(identifier, 'identifier').toLowerCase();
    try {
        buildServerTablePrefix(normalizedIdentifier);
    } catch {
        throw new DatabaseError(
            spaceTrim(`
                Field \`identifier\` must contain only lowercase letters, numbers, and hyphens.

                Example: \`support-eu\`
            `),
        );
    }

    return normalizedIdentifier;
}

/**
 * Validates a manual table prefix.
 *
 * @param tablePrefix - Raw prefix value.
 * @returns Trimmed validated table prefix.
 */
function validateServerTablePrefix(tablePrefix: string): string {
    const normalizedTablePrefix = normalizeNonEmptyText(tablePrefix, 'tablePrefix');
    if (!SERVER_TABLE_PREFIX_PATTERN.test(normalizedTablePrefix)) {
        throw new DatabaseError(
            spaceTrim(`
                Field \`tablePrefix\` must start with a letter, contain only letters, numbers, and underscores, and end with an underscore.

                Example: \`server_MyServer_\`
            `),
        );
    }

    return normalizedTablePrefix;
}

/**
 * Validates and normalizes one server environment value.
 *
 * @param environment - Raw environment value.
 * @returns Normalized supported environment.
 */
function normalizeServerEnvironment(environment: string): ServerEnvironment {
    const normalizedEnvironment = typeof environment === 'string' ? environment.trim().toUpperCase() : '';
    if (!isServerEnvironment(normalizedEnvironment)) {
        throw new DatabaseError(
            spaceTrim(`
                Field \`environment\` must be one of \`PRODUCTION\` or \`PREVIEW\`.
            `),
        );
    }

    return normalizedEnvironment;
}

/**
 * Validates and normalizes one required server domain.
 *
 * @param domain - Raw domain value.
 * @returns Normalized host or `host:port`.
 */
function normalizeRequiredServerDomain(domain: string): string {
    const normalizedDomain = normalizeServerDomain(normalizeNonEmptyText(domain, 'domain'));
    if (!normalizedDomain) {
        throw new DatabaseError(
            spaceTrim(`
                Field \`domain\` must contain a valid host or URL-like domain string.
            `),
        );
    }

    return normalizedDomain;
}

/**
 * Normalizes one seed user entered in the create-server wizard.
 *
 * @param user - Raw user row.
 * @param label - Human-readable label for diagnostics.
 * @param forceAdmin - When true, the user is always created as an admin.
 * @returns Normalized seed user.
 */
function normalizeSeedUser(user: ServerSeedUserInput, label: string, forceAdmin: boolean): NormalizedServerSeedUser {
    const username = normalizeNonEmptyText(user.username, `${label}.username`);
    const password = normalizeNonEmptyText(user.password, `${label}.password`);

    return {
        username,
        password,
        isAdmin: forceAdmin || user.isAdmin === true,
    };
}

/**
 * Ensures the bootstrap user list does not contain duplicate usernames and includes an admin.
 *
 * @param users - Normalized seed users.
 */
function assertUniqueSeedUsernames(users: ReadonlyArray<NormalizedServerSeedUser>): void {
    const seenUsernames = new Set<string>();
    let hasAdmin = false;

    for (const user of users) {
        const normalizedKey = user.username.toLowerCase();
        if (seenUsernames.has(normalizedKey)) {
            throw new ConflictError(
                spaceTrim(`
                    Duplicate bootstrap username \`${user.username}\` is not allowed.
                `),
            );
        }

        seenUsernames.add(normalizedKey);
        hasAdmin = hasAdmin || user.isAdmin;
    }

    if (!hasAdmin) {
        throw new DatabaseError(
            spaceTrim(`
                At least one bootstrap user must have admin access.
            `),
        );
    }
}

/**
 * Quotes a SQL identifier safely for PostgreSQL.
 *
 * @param identifier - Raw identifier.
 * @returns Quoted identifier.
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Escapes one JavaScript value into a SQL literal for downloadable dump generation.
 *
 * @param value - Raw value to serialize.
 * @returns SQL literal string.
 */
function escapeSqlLiteral(value: unknown): string {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : 'NULL';
    }

    const normalizedString = String(value).replace(/'/g, "''");
    return `'${normalizedString}'`;
}

/**
 * Builds one portable SQL `INSERT` statement for the downloadable transaction dump.
 *
 * @param tableName - Target table name.
 * @param values - Column/value map.
 * @returns Complete SQL insert statement.
 */
function createInsertStatement(tableName: string, values: Record<string, unknown>): string {
    const columns = Object.keys(values).map((columnName) => quoteIdentifier(columnName));
    const literals = Object.values(values).map((value) => escapeSqlLiteral(value));
    return `INSERT INTO ${quoteIdentifier(tableName)} (${columns.join(', ')}) VALUES (${literals.join(', ')})`;
}
