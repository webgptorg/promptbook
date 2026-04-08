import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { spaceTrim } from 'spacetrim';
import { ConflictError } from '../../../../../src/errors/ConflictError';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import {
    acquireMigrationExecutionLock,
    releaseMigrationExecutionLock,
} from '../../database/acquireMigrationExecutionLock';
import { metadataDefaults } from '../../database/metadataDefaults';
import { applyPendingMigrationsForPrefix } from '../../database/migratePrefix';
import { readMigrationFiles, resolveMigrationsDirectory } from '../../database/resolveMigrationsDirectory';
import { DATABASE_MIGRATION_APPLIED_BY } from '../../database/runDatabaseMigrations';
import {
    IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY,
    SERVER_LANGUAGE_METADATA_KEY,
} from '../../languages/ServerLanguageRegistry';
import { getPasswordValidationMessage, hashPassword } from '../auth';
import { buildServerTablePrefix } from '../buildServerTablePrefix';
import { isChatFeedbackEnabled, parseChatFeedbackMode, type ChatFeedbackMode } from '../chatFeedbackMode';
import { scheduleDefaultFederatedAgentsSync } from '../defaultFederatedAgents/scheduleDefaultFederatedAgentsSync';
import {
    createServerPublicUrl,
    invalidateRegisteredServersCache,
    parseServerRecord,
    type ServerEnvironment,
    type ServerRecord,
} from '../serverRegistry';
import { ManagedServerInputNormalizer, type NormalizedServerSeedUser } from './ManagedServerInputNormalizer';
import { resolveManagedServerErrorStatus } from './resolveManagedServerErrorStatus';
import { resolveManagedServerConnectionString } from './resolveManagedServerConnectionString';
import { SERVER_REGISTRY_TABLE_NAME } from './SERVER_REGISTRY_TABLE_NAME';

/**
 * Constant for boolean feature flag metadata key by field.
 */
const BOOLEAN_FEATURE_FLAG_METADATA_KEY_BY_FIELD = {
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
     * Feedback mode used in chats after assistant responses.
     */
    readonly feedbackMode?: ChatFeedbackMode;

    /**
     * Legacy feedback toggle kept for backwards compatibility with older wizard payloads.
     */
    readonly isFeedbackEnabled?: boolean;

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
 * One metadata row inserted during server bootstrap.
 *
 * @private type of serverManagement
 */
export type ServerMetadataSeedEntry = {
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
 *
 * @private type of serverManagement
 */
export type NormalizedCreateServerInput = {
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
 *
 * @private type of serverManagement
 */
export type SqlRecorder = {
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
 * Creates a new registered server, runs migrations for its prefix, and seeds users/metadata in one transaction.
 *
 * @param input - Create-server payload from the wizard.
 * @returns Success result or a failure payload containing the attempted SQL dump.
 */
export async function createManagedServer(input: CreateServerInput): Promise<CreateServerResult> {
    let normalizedInput: NormalizedCreateServerInput;

    try {
        normalizedInput = normalizeCreateServerInput(input);
    } catch (error) {
        return createFailedServerResult(error, null, null);
    }

    return bootstrapManagedServer(normalizedInput);
}

/**
 * Executes the transactional bootstrap for one normalized managed server.
 *
 * @param input - Validated bootstrap payload.
 * @returns Successful create result.
 *
 * @private function of serverManagement
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
 * Inserts the new server row into the shared `_Server` registry.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 * @returns Parsed registry row.
 *
 * @private function of serverManagement
 */
export async function insertManagedServerRegistryRow(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<ServerRecord> {
    const insertRegistryResult = await client.query<Record<string, unknown>>(
        `
            INSERT INTO "${SERVER_REGISTRY_TABLE_NAME}" ("name", "environment", "domain", "tablePrefix")
            VALUES ($1, $2, $3, $4)
            RETURNING "id", "name", "environment", "domain", "tablePrefix", "createdAt", "updatedAt"
        `,
        [input.name, input.environment, input.domain, input.tablePrefix],
    );

    sqlRecorder.addStatement(
        createInsertStatement(SERVER_REGISTRY_TABLE_NAME, {
            name: input.name,
            environment: input.environment,
            domain: input.domain,
            tablePrefix: input.tablePrefix,
        }),
    );

    const serverRow = insertRegistryResult.rows[0];

    if (!serverRow) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to insert a row into \`${SERVER_REGISTRY_TABLE_NAME}\` for server \`${input.name}\`.
            `),
        );
    }

    return parseServerRecord(serverRow);
}

/**
 * Applies all currently pending prefix migrations and records them in the SQL dump.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 * @param migrationLogger - Logger matching the migration helper contract.
 *
 * @private function of serverManagement
 */
export async function applyManagedServerMigrations(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
    migrationLogger: Pick<Console, 'error' | 'info' | 'warn'>,
): Promise<void> {
    const migrationsDirectory = resolveMigrationsDirectory();
    const migrationFiles = readMigrationFiles(migrationsDirectory);

    for (const migrationFile of migrationFiles) {
        const rawMigrationSql = await readFile(`${migrationsDirectory}/${migrationFile}`, 'utf-8');
        sqlRecorder.addStatement(rawMigrationSql.replace(/prefix_/g, input.tablePrefix));
        sqlRecorder.addStatement(
            createInsertStatement(`${input.tablePrefix}Migrations`, {
                filename: migrationFile,
                appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
            }),
        );
    }

    await applyPendingMigrationsForPrefix({
        prefix: input.tablePrefix,
        appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
        manualAppliedByDefault: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
        client,
        logger: migrationLogger,
        migrationFiles,
        migrationsDirectory,
        logSqlStatements: false,
    });
}

/**
 * Normalizes and validates the create-server payload.
 *
 * @param input - Raw API payload.
 * @returns Validated payload ready for transactional bootstrap.
 *
 * @private function of serverManagement
 */
export function normalizeCreateServerInput(input: CreateServerInput): NormalizedCreateServerInput {
    const name = ManagedServerInputNormalizer.normalizeNonEmptyText(input.name, 'name');
    const identifier = ManagedServerInputNormalizer.normalizeServerIdentifier(input.identifier);
    const tablePrefix = ManagedServerInputNormalizer.validateServerTablePrefix(input.tablePrefix);
    const expectedTablePrefix = buildServerTablePrefix(identifier);

    if (tablePrefix !== expectedTablePrefix) {
        throw new DatabaseError(
            spaceTrim(`
                Table prefix \`${tablePrefix}\` does not match identifier \`${identifier}\`.

                Expected \`${expectedTablePrefix}\`.
            `),
        );
    }

    const language = ManagedServerInputNormalizer.normalizeNonEmptyText(input.initialSettings.language, 'initialSettings.language');
    const iconUrl = ManagedServerInputNormalizer.normalizeOptionalText(input.iconUrl);
    const users = [
        ManagedServerInputNormalizer.normalizeSeedUser(input.adminUser, 'admin user', true),
        ...(input.additionalUsers || []).map((user, index) =>
            ManagedServerInputNormalizer.normalizeSeedUser(user, `additional user ${index + 1}`, false),
        ),
    ];

    ManagedServerInputNormalizer.assertUniqueSeedUsernames(users);

    return {
        name,
        identifier,
        environment: ManagedServerInputNormalizer.normalizeServerEnvironment(input.environment),
        domain: ManagedServerInputNormalizer.normalizeRequiredServerDomain(input.domain),
        tablePrefix,
        iconUrl,
        users,
        metadataEntries: buildServerMetadataSeedEntries({
            name,
            language,
            homepageMessage: ManagedServerInputNormalizer.normalizeOptionalText(input.initialSettings.homepageMessage) || '',
            iconUrl,
            feedbackMode: parseChatFeedbackMode(
                input.initialSettings.feedbackMode,
                resolveLegacyFeedbackEnabled(input.initialSettings.isFeedbackEnabled),
            ),
            initialSettings: input.initialSettings,
        }),
    };
}

/**
 * Converts the deprecated feedback toggle into the legacy string expected by `parseChatFeedbackMode`.
 *
 * @param isFeedbackEnabled - Legacy boolean from older create-server payloads.
 * @returns Legacy string representation or `null`.
 *
 * @private function of serverManagement
 */
export function resolveLegacyFeedbackEnabled(isFeedbackEnabled: boolean | undefined): string | null {
    if (typeof isFeedbackEnabled !== 'boolean') {
        return null;
    }

    return isFeedbackEnabled ? 'true' : 'false';
}

/**
 * Builds metadata rows inserted during create-server bootstrap.
 *
 * @param options - Normalized metadata inputs from the wizard.
 * @returns Metadata seed rows.
 *
 * @private function of serverManagement
 */
export function buildServerMetadataSeedEntries(options: {
    readonly name: string;
    readonly language: string;
    readonly homepageMessage: string;
    readonly iconUrl: string | null;
    readonly feedbackMode: ChatFeedbackMode;
    readonly initialSettings: CreateServerInitialSettings;
}): ReadonlyArray<ServerMetadataSeedEntry> {
    const entries: Array<ServerMetadataSeedEntry> = [
        createMetadataSeedEntry('SERVER_NAME', options.name),
        createMetadataSeedEntry(SERVER_LANGUAGE_METADATA_KEY, options.language),
        createMetadataSeedEntry(IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY, 'false'),
        createMetadataSeedEntry('CHAT_FEEDBACK_MODE', options.feedbackMode),
        createMetadataSeedEntry('IS_FEEDBACK_ENABLED', isChatFeedbackEnabled(options.feedbackMode) ? 'true' : 'false'),
    ];

    if (options.homepageMessage !== '') {
        entries.push(createMetadataSeedEntry('HOMEPAGE_MESSAGE', options.homepageMessage));
    }

    if (options.iconUrl) {
        entries.push(createMetadataSeedEntry('SERVER_LOGO_URL', options.iconUrl));
        entries.push(createMetadataSeedEntry('SERVER_FAVICON_URL', options.iconUrl));
    }

    for (const [fieldName, metadataKey] of Object.entries(BOOLEAN_FEATURE_FLAG_METADATA_KEY_BY_FIELD)) {
        const fieldValue =
            options.initialSettings[fieldName as keyof typeof BOOLEAN_FEATURE_FLAG_METADATA_KEY_BY_FIELD];
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
 *
 * @private function of serverManagement
 */
export function createMetadataSeedEntry(key: string, value: string): ServerMetadataSeedEntry {
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
 *
 * @private function of serverManagement
 */
export async function seedServerUsers(
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
 *
 * @private function of serverManagement
 */
export async function seedServerMetadata(
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
 *
 * @private function of serverManagement
 */
export function createFailedServerResult(
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
 *
 * @private function of serverManagement
 */
export function createSqlRecorder(identifier: string): SqlRecorder {
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
 *
 * @private function of serverManagement
 */
export function createSilentMigrationLogger(): Pick<Console, 'error' | 'info' | 'warn'> {
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
 *
 * @private function of serverManagement
 */
export function normalizeBootstrapTransactionError(error: unknown): unknown {
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
 * Quotes a SQL identifier safely for PostgreSQL.
 *
 * @param identifier - Raw identifier.
 * @returns Quoted identifier.
 *
 * @private function of serverManagement
 */
export function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Escapes one JavaScript value into a SQL literal for downloadable dump generation.
 *
 * @param value - Raw value to serialize.
 * @returns SQL literal string.
 *
 * @private function of serverManagement
 */
export function escapeSqlLiteral(value: unknown): string {
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
 *
 * @private function of serverManagement
 */
export function createInsertStatement(tableName: string, values: Record<string, unknown>): string {
    const columns = Object.keys(values).map((columnName) => quoteIdentifier(columnName));
    const literals = Object.values(values).map((value) => escapeSqlLiteral(value));

    return `INSERT INTO ${quoteIdentifier(tableName)} (${columns.join(', ')}) VALUES (${literals.join(', ')})`;
}
