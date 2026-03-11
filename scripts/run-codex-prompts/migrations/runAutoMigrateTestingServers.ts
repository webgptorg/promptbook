import colors from 'colors';
import * as fs from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import spaceTrim from 'spacetrim';
import { readMigrationFiles, resolveMigrationsDirectory } from '../../../apps/agents-server/src/database/resolveMigrationsDirectory';
import {
    DATABASE_MIGRATION_APPLIED_BY,
    resolveDatabaseMigrationRuntimeConfiguration,
    runDatabaseMigrations,
    type DatabaseMigrationLogger,
} from '../../../apps/agents-server/src/database/runDatabaseMigrations';
import { selectPrefixesForMigration } from '../../../apps/agents-server/src/database/selectPrefixesForMigration';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import {
    DESTRUCTIVE_SQL_RULE,
    detectDestructiveSqlStatements,
    type DestructiveSqlStatementMatch,
} from './detectDestructiveSqlStatements';

/**
 * Migration targets for testing servers that should be migrated by coding-script auto-migration.
 */
const TESTING_SERVER_MIGRATION_TARGETS = ['preview'] as const;

/**
 * CLI-like `--only` value used in logs for easier parity with `terminals.json` migration command.
 */
const TESTING_SERVER_MIGRATION_ONLY_VALUE = TESTING_SERVER_MIGRATION_TARGETS.join(',');

/**
 * Maximum length of SQL snippet preview shown in safety errors.
 */
const MAX_SQL_PREVIEW_LENGTH = 180;

/**
 * One migration file with destructive statement matches for one prefix.
 */
type DestructivePendingMigrationFinding = {
    /**
     * Prefix where this migration file is still pending.
     */
    readonly prefix: string;
    /**
     * Migration filename.
     */
    readonly migrationFile: string;
    /**
     * Heuristic destructive SQL matches found in migration SQL source.
     */
    readonly destructiveMatches: ReadonlyArray<DestructiveSqlStatementMatch>;
};

/**
 * One prefix with pending migration filenames.
 */
type PendingMigrationByPrefix = {
    /**
     * Prefix being inspected.
     */
    readonly prefix: string;
    /**
     * Migration filenames that are pending for this prefix.
     */
    readonly pendingMigrationFiles: ReadonlyArray<string>;
};

/**
 * Options controlling testing-server auto-migration after one completed coding prompt.
 */
export type RunAutoMigrateTestingServersOptions = {
    /**
     * When true, runs migration even if destructive migration heuristics detect risky SQL.
     */
    readonly allowDestructiveAutoMigrate: boolean;
    /**
     * Logger used for migration progress output.
     */
    readonly logger?: DatabaseMigrationLogger;
};

/**
 * Promise queue ensuring auto-migration requests are processed sequentially in-process.
 */
let autoMigrationQueue: Promise<void> = Promise.resolve();

/**
 * Runs testing-server migration flow with destructive-SQL guardrail.
 *
 * Calls are serialized in-process and also rely on shared DB advisory lock in migration runner.
 *
 * @param options Auto-migration options.
 */
export async function runAutoMigrateTestingServers(options: RunAutoMigrateTestingServersOptions): Promise<void> {
    const queuedRun = autoMigrationQueue.then(async () => runAutoMigrateTestingServersImmediately(options));
    autoMigrationQueue = queuedRun.catch(() => undefined);
    return queuedRun;
}

/**
 * Performs one immediate auto-migration run.
 *
 * @param options Auto-migration options.
 */
async function runAutoMigrateTestingServersImmediately(options: RunAutoMigrateTestingServersOptions): Promise<void> {
    const logger = options.logger ?? console;
    const runtimeConfiguration = await resolveDatabaseMigrationRuntimeConfiguration(logger);

    if (!runtimeConfiguration) {
        return;
    }

    const testingServerMigrationPrefixes = selectPrefixesForMigration(
        runtimeConfiguration.prefixes,
        runtimeConfiguration.registeredServers,
        TESTING_SERVER_MIGRATION_TARGETS,
    );

    const migrationsDirectory = resolveMigrationsDirectory();
    const migrationFiles = readMigrationFiles(migrationsDirectory);
    const pendingMigrationsByPrefix = await listPendingMigrationsByPrefix({
        connectionString: runtimeConfiguration.connectionString,
        migrationFiles,
        prefixes: testingServerMigrationPrefixes,
    });
    const destructiveFindings = collectDestructivePendingMigrationFindings({
        pendingMigrationsByPrefix,
        migrationsDirectory,
    });

    if (destructiveFindings.length > 0 && !options.allowDestructiveAutoMigrate) {
        throw createDestructiveAutoMigrationBlockedError(destructiveFindings);
    }

    if (destructiveFindings.length > 0) {
        logger.warn(
            colors.yellow(
                '⚠️ Destructive pending migrations detected, but override is enabled via `--allow-destructive-auto-migrate`.',
            ),
        );
    }

    logger.info(
        colors.bgBlue(
            `🚀 Auto-migrating testing servers (equivalent to: npx tsx ./src/database/migrate.ts --only=${TESTING_SERVER_MIGRATION_ONLY_VALUE})`,
        ),
    );

    await runDatabaseMigrations({
        prefixes: runtimeConfiguration.prefixes,
        registeredServers: runtimeConfiguration.registeredServers,
        onlyTargets: TESTING_SERVER_MIGRATION_TARGETS,
        connectionString: runtimeConfiguration.connectionString,
        appliedBy: DATABASE_MIGRATION_APPLIED_BY.AUTOMATIC,
        logger,
        logSqlStatements: true,
    });

    logger.info(colors.bgGreen('✅ Testing-server auto-migration finished'));
}

/**
 * Reads pending migration filenames for each testing prefix.
 *
 * @param options Database inspection options.
 * @returns Pending migration files grouped by prefix.
 */
async function listPendingMigrationsByPrefix(options: {
    readonly connectionString: string;
    readonly migrationFiles: ReadonlyArray<string>;
    readonly prefixes: ReadonlyArray<string>;
}): Promise<Array<PendingMigrationByPrefix>> {
    const client = new Client({
        connectionString: options.connectionString,
        ssl: { rejectUnauthorized: false },
    });

    const pendingMigrationsByPrefix: Array<PendingMigrationByPrefix> = [];

    try {
        await client.connect();

        for (const prefix of options.prefixes) {
            const pendingMigrationFiles = await listPendingMigrationFilesForPrefix({
                client,
                prefix,
                migrationFiles: options.migrationFiles,
            });

            pendingMigrationsByPrefix.push({
                prefix,
                pendingMigrationFiles,
            });
        }
    } finally {
        await client.end();
    }

    return pendingMigrationsByPrefix;
}

/**
 * Reads pending migration filenames for one prefix.
 *
 * @param options Prefix inspection options.
 * @returns Pending migration filenames in sorted migration order.
 */
async function listPendingMigrationFilesForPrefix(options: {
    readonly client: Client;
    readonly prefix: string;
    readonly migrationFiles: ReadonlyArray<string>;
}): Promise<Array<string>> {
    const migrationsTableName = `${options.prefix}Migrations`;

    if (!(await doesTableExist(options.client, migrationsTableName))) {
        return [...options.migrationFiles];
    }

    const { rows } = await options.client.query<{ filename: string }>(
        `SELECT "filename" FROM ${quoteIdentifier(migrationsTableName)}`,
    );
    const appliedMigrations = new Set(rows.map((row) => row.filename));

    return options.migrationFiles.filter((migrationFile) => !appliedMigrations.has(migrationFile));
}

/**
 * Checks whether a table exists in current schema.
 *
 * @param client Connected PostgreSQL client.
 * @param tableName Table name.
 * @returns `true` when table exists.
 */
async function doesTableExist(client: Client, tableName: string): Promise<boolean> {
    const { rows } = await client.query<{ hasTable: boolean }>(
        `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = current_schema()
              AND table_name = $1
        ) AS "hasTable"
        `,
        [tableName],
    );

    return rows[0]?.hasTable === true;
}

/**
 * Collects destructive SQL findings from pending migrations across all prefixes.
 *
 * @param options Pending migrations and migrations directory.
 * @returns List of destructive findings.
 */
function collectDestructivePendingMigrationFindings(options: {
    readonly pendingMigrationsByPrefix: ReadonlyArray<PendingMigrationByPrefix>;
    readonly migrationsDirectory: string;
}): Array<DestructivePendingMigrationFinding> {
    const destructiveMatchesByMigrationFile = new Map<string, ReadonlyArray<DestructiveSqlStatementMatch>>();
    const findings: Array<DestructivePendingMigrationFinding> = [];

    for (const { prefix, pendingMigrationFiles } of options.pendingMigrationsByPrefix) {
        for (const migrationFile of pendingMigrationFiles) {
            if (!destructiveMatchesByMigrationFile.has(migrationFile)) {
                const migrationFilePath = join(options.migrationsDirectory, migrationFile);
                const migrationSql = fs.readFileSync(migrationFilePath, 'utf-8');
                destructiveMatchesByMigrationFile.set(migrationFile, detectDestructiveSqlStatements(migrationSql));
            }

            const destructiveMatches = destructiveMatchesByMigrationFile.get(migrationFile)!;
            if (destructiveMatches.length > 0) {
                findings.push({
                    prefix,
                    migrationFile,
                    destructiveMatches,
                });
            }
        }
    }

    return findings;
}

/**
 * Creates error raised when destructive pending migrations are detected without explicit override.
 *
 * @param findings Destructive pending migration findings.
 * @returns Branded database error with mitigation instructions.
 */
function createDestructiveAutoMigrationBlockedError(
    findings: ReadonlyArray<DestructivePendingMigrationFinding>,
): DatabaseError {
    const findingLines = findings
        .map(
            ({ prefix, migrationFile, destructiveMatches }) =>
                `- \`${prefix}\` -> \`${migrationFile}\` (${destructiveMatches
                    .map((match) => `${getReadableRuleName(match.rule)}: ${createSqlStatementPreview(match.statement)}`)
                    .join(' | ')})`,
        )
        .join('\n');

    return new DatabaseError(
        spaceTrim(
            (block) => `
                Auto-migration blocked because pending testing-server migrations contain potentially destructive SQL.

                Review these migration statements:
                ${block(findingLines)}

                If this is intentional, rerun coding script with:
                ${block(`--auto-migrate --allow-destructive-auto-migrate`)}
            `,
        ),
    );
}

/**
 * Human-readable destructive rule label for logs and error output.
 *
 * @param rule Heuristic destructive SQL rule key.
 * @returns Human-readable label.
 */
function getReadableRuleName(rule: DestructiveSqlStatementMatch['rule']): string {
    if (rule === DESTRUCTIVE_SQL_RULE.DROP_TABLE) {
        return 'DROP TABLE';
    }
    if (rule === DESTRUCTIVE_SQL_RULE.DROP_COLUMN) {
        return 'ALTER TABLE ... DROP COLUMN';
    }
    if (rule === DESTRUCTIVE_SQL_RULE.TRUNCATE) {
        return 'TRUNCATE';
    }
    return 'DELETE FROM without WHERE';
}

/**
 * Creates short SQL preview for one matched statement.
 *
 * @param statement Matched SQL statement.
 * @returns One-line preview of statement.
 */
function createSqlStatementPreview(statement: string): string {
    const normalizedStatement = statement.replace(/\s+/g, ' ').trim();
    if (normalizedStatement.length <= MAX_SQL_PREVIEW_LENGTH) {
        return `\`${normalizedStatement}\``;
    }

    return `\`${normalizedStatement.slice(0, MAX_SQL_PREVIEW_LENGTH)}...\``;
}

/**
 * Quotes SQL identifier for PostgreSQL.
 *
 * @param identifier Raw SQL identifier.
 * @returns Safely quoted identifier.
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}
