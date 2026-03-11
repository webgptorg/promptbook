#!/usr/bin/env ts-node
// backup-supabase.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import JSZip from 'jszip';
import { mkdir, stat, writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';
import { Client } from 'pg';
import { DatabaseError } from '../../src/errors/DatabaseError';
import { EnvironmentMismatchError } from '../../src/errors/EnvironmentMismatchError';
import { NotFoundError } from '../../src/errors/NotFoundError';
import { assertsError } from '../../src/errors/assertsError';
import { spaceTrim } from '../../src/utils/organization/spaceTrim';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red('CWD must be root of the project'));
    process.exit(1);
}

/**
 * Supported environment variable names for PostgreSQL connection string resolution.
 */
const DATABASE_CONNECTION_ENV_NAMES = ['POSTGRES_URL', 'DATABASE_URL'] as const;

/**
 * Default schema list when no CLI override is provided.
 */
const DEFAULT_SCHEMA_NAMES = 'public';

/**
 * Default target directory for backup ZIP files.
 */
const DEFAULT_OUTPUT_DIRECTORY = 'backups/supabase';

/**
 * Default backup filename pattern.
 *
 * The `%timestamp%` token resolves to `YYYY-MM-DD_HH-mm-ss`.
 */
const DEFAULT_FILENAME_PATTERN = '%timestamp%.sql.zip';

/**
 * Placeholder token for full date+time value in output filename pattern.
 */
const FILENAME_PATTERN_TOKEN_TIMESTAMP = '%timestamp%';

/**
 * Placeholder token for date-only value in output filename pattern.
 */
const FILENAME_PATTERN_TOKEN_DATE = '%date%';

/**
 * Placeholder token for time-only value in output filename pattern.
 */
const FILENAME_PATTERN_TOKEN_TIME = '%time%';

/**
 * Placeholder token for PostgreSQL database name in output filename pattern.
 */
const FILENAME_PATTERN_TOKEN_DATABASE = '%database%';

/**
 * CSV token used by PostgreSQL `COPY ... NULL`.
 */
const COPY_NULL_TOKEN = '\\N';

/**
 * Maximum DEFLATE compression level used for ZIP output.
 */
const ZIP_COMPRESSION_LEVEL = 9;

/**
 * CLI options accepted by the backup command.
 */
type BackupSupabaseCommandOptions = {
    /**
     * Optional direct PostgreSQL connection string.
     */
    readonly connectionString?: string;
    /**
     * Comma-separated schema list to back up.
     */
    readonly schemas: string;
    /**
     * Output directory where ZIP file should be created.
     */
    readonly outputDir: string;
    /**
     * Output filename pattern with placeholder tokens.
     */
    readonly filenamePattern: string;
};

/**
 * Normalized runtime options used by backup logic.
 */
type BackupSupabaseRuntimeOptions = {
    /**
     * PostgreSQL connection string.
     */
    readonly connectionString: string;
    /**
     * Schema names included in backup.
     */
    readonly schemaNames: ReadonlyArray<string>;
    /**
     * Output directory where ZIP file will be written.
     */
    readonly outputDirectory: string;
    /**
     * Filename pattern for ZIP output.
     */
    readonly filenamePattern: string;
};

/**
 * One physical table selected for backup.
 */
type TableReference = {
    /**
     * Schema where table exists.
     */
    readonly schemaName: string;
    /**
     * Table name inside schema.
     */
    readonly tableName: string;
};

/**
 * One table-column definition used for SQL schema recreation.
 */
type TableColumn = {
    /**
     * Column name.
     */
    readonly columnName: string;
    /**
     * PostgreSQL data type rendered by `format_type`.
     */
    readonly dataType: string;
    /**
     * Whether column is declared as NOT NULL.
     */
    readonly isNotNull: boolean;
    /**
     * Default expression returned by `pg_get_expr` (if any).
     */
    readonly defaultExpression: string | null;
    /**
     * Identity kind (`a` = always, `d` = by default, empty = not identity).
     */
    readonly identityKind: '' | 'a' | 'd';
    /**
     * Generated kind (`s` for stored generated columns, empty otherwise).
     */
    readonly generatedKind: '' | 's';
};

/**
 * One table constraint line in CREATE TABLE statement.
 */
type TableConstraint = {
    /**
     * Constraint name.
     */
    readonly constraintName: string;
    /**
     * SQL constraint body from `pg_get_constraintdef`.
     */
    readonly constraintDefinition: string;
};

/**
 * One index DDL statement for a table.
 */
type TableIndex = {
    /**
     * Index name.
     */
    readonly indexName: string;
    /**
     * Full `CREATE INDEX ...` statement.
     */
    readonly indexDefinition: string;
};

/**
 * One trigger DDL statement for a table.
 */
type TableTrigger = {
    /**
     * Trigger name.
     */
    readonly triggerName: string;
    /**
     * Full `CREATE TRIGGER ...` statement.
     */
    readonly triggerDefinition: string;
};

/**
 * Sequence metadata used to recreate serial-backed defaults.
 */
type TableSequence = {
    /**
     * Sequence schema name.
     */
    readonly sequenceSchemaName: string;
    /**
     * Sequence name.
     */
    readonly sequenceName: string;
    /**
     * Table column owning the sequence.
     */
    readonly owningColumnName: string;
    /**
     * Sequence start value.
     */
    readonly startValue: string;
    /**
     * Sequence increment.
     */
    readonly incrementBy: string;
    /**
     * Sequence minimum value.
     */
    readonly minValue: string;
    /**
     * Sequence maximum value.
     */
    readonly maxValue: string;
    /**
     * Sequence cache size.
     */
    readonly cacheSize: string;
    /**
     * Whether sequence cycles.
     */
    readonly isCycle: boolean;
    /**
     * Last persisted sequence value.
     */
    readonly lastValue: string | null;
};

/**
 * Small immutable table with resolved filename tokens.
 */
type FilenamePatternTokens = {
    /**
     * `%timestamp%` resolved value.
     */
    readonly timestamp: string;
    /**
     * `%date%` resolved value.
     */
    readonly date: string;
    /**
     * `%time%` resolved value.
     */
    readonly time: string;
    /**
     * `%database%` resolved value.
     */
    readonly database: string;
};

const program = new commander.Command();
program.name('backup-supabase');
program.description('Back up Supabase PostgreSQL schema + data into one ZIP file (without pg_dump).');
program.option(
    '--connection-string <connectionString>',
    'PostgreSQL connection string. Defaults to POSTGRES_URL / DATABASE_URL environment variables.',
);
program.option('--schemas <schemas>', 'Comma-separated schema names to include.', DEFAULT_SCHEMA_NAMES);
program.option('--output-dir <outputDir>', 'Output directory for backup ZIP files.', DEFAULT_OUTPUT_DIRECTORY);
program.option(
    '--filename-pattern <filenamePattern>',
    spaceTrim(`
        Output filename pattern.
        Supported tokens: %timestamp%, %date%, %time%, %database%
    `),
    DEFAULT_FILENAME_PATTERN,
);
program.parse(process.argv);

const runtimeOptions = parseBackupSupabaseRuntimeOptions(program.opts() as BackupSupabaseCommandOptions);

backupSupabase(runtimeOptions)
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Runs complete Supabase backup workflow for selected schemas.
 *
 * @param options Normalized runtime options.
 */
async function backupSupabase(options: BackupSupabaseRuntimeOptions): Promise<void> {
    const serverDescription = describeConnection(options.connectionString);
    const outputFilename = renderOutputFilename(options.filenamePattern, options.connectionString);
    const outputFilePath = resolve(options.outputDirectory, outputFilename);

    console.info(colors.bgBlue('🚀 Starting Supabase PostgreSQL backup'));
    console.info(colors.cyan(`🛰️ Server: ${serverDescription}`));
    console.info(colors.cyan(`📚 Schemas: ${options.schemaNames.join(', ')}`));
    console.info(colors.cyan(`📦 Output: ${normalizePathForLogs(outputFilePath)}`));

    const client = new Client({
        connectionString: options.connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.info('🔌 Connected to database');

        const tableReferences = await fetchTableReferences(client, options.schemaNames);
        if (tableReferences.length === 0) {
            throw new NotFoundError(
                spaceTrim(`
                    No tables found for schemas: \`${options.schemaNames.join(', ')}\`.

                    Check that the selected schemas exist and contain application tables.
                `),
            );
        }

        const zip = new JSZip();
        for (const tableReference of tableReferences) {
            const tableIdentifierForLogs = `${tableReference.schemaName}.${tableReference.tableName}`;
            console.info(`📄 Exporting ${tableIdentifierForLogs}`);
            const sqlFileContent = await createTableSqlFileContent(client, tableReference);
            zip.file(
                `${sanitizePathSegment(tableReference.schemaName)}/${sanitizePathSegment(tableReference.tableName)}.sql`,
                sqlFileContent,
            );
        }

        await mkdir(options.outputDirectory, { recursive: true });
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: ZIP_COMPRESSION_LEVEL },
        });
        await writeFile(outputFilePath, zipBuffer);

        const outputStat = await stat(outputFilePath);
        console.info(colors.bgGreen('✅ Supabase backup completed'));
        console.info(colors.green(`📁 File: ${normalizePathForLogs(outputFilePath)}`));
        console.info(colors.green(`📊 Size: ${formatFileSize(outputStat.size)}`));
        console.info(colors.green(`🧾 Tables: ${tableReferences.length}`));
    } catch (error) {
        throw createBackupError(error);
    } finally {
        await client.end();
    }
}

/**
 * Parses raw commander options and validates required backup values.
 *
 * @param options Raw options from commander.
 * @returns Validated runtime options.
 */
function parseBackupSupabaseRuntimeOptions(options: BackupSupabaseCommandOptions): BackupSupabaseRuntimeOptions {
    const connectionString = options.connectionString || resolveConnectionStringFromEnvironment();
    if (!connectionString) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Missing PostgreSQL connection string.

                Provide \`--connection-string\` or set one of:
                - \`${DATABASE_CONNECTION_ENV_NAMES[0]}\`
                - \`${DATABASE_CONNECTION_ENV_NAMES[1]}\`
            `),
        );
    }

    const schemaNames = options.schemas
        .split(',')
        .map((schemaName) => schemaName.trim())
        .filter((schemaName) => schemaName !== '');

    if (schemaNames.length === 0) {
        throw new EnvironmentMismatchError('No schemas were provided. Use `--schemas public,...`.');
    }

    if (options.outputDir.trim() === '') {
        throw new EnvironmentMismatchError('Output directory cannot be empty.');
    }

    if (options.filenamePattern.trim() === '') {
        throw new EnvironmentMismatchError('Filename pattern cannot be empty.');
    }

    return {
        connectionString,
        schemaNames,
        outputDirectory: options.outputDir,
        filenamePattern: options.filenamePattern,
    };
}

/**
 * Resolves connection string from known environment variables.
 *
 * @returns Connection string or `null` when not configured.
 */
function resolveConnectionStringFromEnvironment(): string | null {
    for (const envName of DATABASE_CONNECTION_ENV_NAMES) {
        const envValue = process.env[envName];
        if (envValue) {
            return envValue;
        }
    }
    return null;
}

/**
 * Describes PostgreSQL server endpoint for logs without leaking secrets.
 *
 * @param connectionString Full PostgreSQL connection string.
 * @returns Human-readable server description safe for logs.
 */
function describeConnection(connectionString: string): string {
    try {
        const parsed = new URL(connectionString);
        const protocol = parsed.protocol.replace(':', '') || 'postgresql';
        const host = parsed.hostname || 'unknown-host';
        const port = parsed.port || '5432';
        const database = parsed.pathname.replace(/^\//, '') || 'unknown-database';
        const username = parsed.username ? `${decodeURIComponent(parsed.username)}@` : '';
        return `${protocol}://${username}${host}:${port}/${database}`;
    } catch {
        return 'PostgreSQL server (masked)';
    }
}

/**
 * Renders output filename from configured pattern and resolved token values.
 *
 * @param filenamePattern Raw filename pattern from CLI.
 * @param connectionString PostgreSQL connection string.
 * @returns Rendered filename.
 */
function renderOutputFilename(filenamePattern: string, connectionString: string): string {
    const now = new Date();
    const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const time = `${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}`;
    const database = resolveDatabaseNameFromConnectionString(connectionString);
    const tokens: FilenamePatternTokens = {
        timestamp: `${date}_${time}`,
        date,
        time,
        database,
    };

    const renderedFilename = filenamePattern
        .replaceAll(FILENAME_PATTERN_TOKEN_TIMESTAMP, tokens.timestamp)
        .replaceAll(FILENAME_PATTERN_TOKEN_DATE, tokens.date)
        .replaceAll(FILENAME_PATTERN_TOKEN_TIME, tokens.time)
        .replaceAll(FILENAME_PATTERN_TOKEN_DATABASE, tokens.database);

    return renderedFilename;
}

/**
 * Resolves database name from connection string for `%database%` token.
 *
 * @param connectionString PostgreSQL connection string.
 * @returns Safe database identifier for filenames.
 */
function resolveDatabaseNameFromConnectionString(connectionString: string): string {
    try {
        const parsed = new URL(connectionString);
        const databaseName = parsed.pathname.replace(/^\//, '') || 'database';
        return sanitizePathSegment(databaseName);
    } catch {
        return 'database';
    }
}

/**
 * Reads all base tables from selected schemas.
 *
 * @param client Connected PostgreSQL client.
 * @param schemaNames Schemas selected for backup.
 * @returns Ordered table references.
 */
async function fetchTableReferences(client: Client, schemaNames: ReadonlyArray<string>): Promise<Array<TableReference>> {
    const { rows } = await client.query<TableReference>(
        `
            SELECT
                table_schema AS "schemaName",
                table_name AS "tableName"
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema = ANY($1::text[])
            ORDER BY table_schema, table_name
        `,
        [schemaNames],
    );
    return rows;
}

/**
 * Builds SQL file content for one table (schema + data).
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Target table reference.
 * @returns SQL file text.
 */
async function createTableSqlFileContent(client: Client, tableReference: TableReference): Promise<string> {
    const tableColumns = await fetchTableColumns(client, tableReference);
    const tableConstraints = await fetchTableConstraints(client, tableReference);
    const tableConstraintBackedIndexNames = await fetchConstraintBackedIndexNames(client, tableReference);
    const tableIndexes = (await fetchTableIndexes(client, tableReference)).filter(
        (tableIndex) => !tableConstraintBackedIndexNames.has(tableIndex.indexName),
    );
    const tableTriggers = await fetchTableTriggers(client, tableReference);
    const tablePrimaryKeyColumns = await fetchTablePrimaryKeyColumns(client, tableReference);
    const tableRows = await fetchTableRowsAsText(client, tableReference, tableColumns, tablePrimaryKeyColumns);
    const tableSequences = await fetchTableSequences(client, tableReference, tableColumns);

    if (tableColumns.length === 0) {
        throw new DatabaseError(`Table "${tableReference.schemaName}.${tableReference.tableName}" has no columns.`);
    }

    const tableIdentifier = quoteQualifiedIdentifier(tableReference.schemaName, tableReference.tableName);
    const tableSchemaIdentifier = quoteIdentifier(tableReference.schemaName);
    const copyColumnList = tableColumns.map((column) => quoteIdentifier(column.columnName)).join(', ');
    const copyRows = tableRows
        .map((tableRow) => serializeCsvRow(tableColumns.map((column) => tableRow[column.columnName] ?? null)))
        .join('\n');

    const sequenceDefinitionSql = tableSequences.map((tableSequence) => renderTableSequence(tableReference, tableSequence)).join('\n');
    const createTableSql = renderCreateTableStatement(tableReference, tableColumns, tableConstraints);
    const indexSql = tableIndexes.map((tableIndex) => appendStatementSemicolon(tableIndex.indexDefinition)).join('\n');
    const triggerSql = tableTriggers.map((tableTrigger) => appendStatementSemicolon(tableTrigger.triggerDefinition)).join('\n');
    const sequenceSetValueSql = tableSequences
        .filter((tableSequence) => tableSequence.lastValue !== null)
        .map((tableSequence) =>
            appendStatementSemicolon(
                `SELECT setval(${toSqlStringLiteral(
                    quoteQualifiedIdentifier(tableSequence.sequenceSchemaName, tableSequence.sequenceName),
                )}, ${tableSequence.lastValue}, true)`,
            ),
        )
        .join('\n');

    return spaceTrim(
        (block) => `
            -- Supabase table backup: ${tableReference.schemaName}.${tableReference.tableName}
            -- Generated at: ${new Date().toISOString()}

            BEGIN;

            CREATE SCHEMA IF NOT EXISTS ${tableSchemaIdentifier};
            ${block(sequenceDefinitionSql)}
            ${createTableSql}

            TRUNCATE TABLE ${tableIdentifier} RESTART IDENTITY CASCADE;
            COPY ${tableIdentifier} (${copyColumnList}) FROM stdin WITH (FORMAT csv, NULL '${COPY_NULL_TOKEN}');
            ${block(copyRows)}
            \\.

            ${block(indexSql)}
            ${block(triggerSql)}
            ${block(sequenceSetValueSql)}

            COMMIT;
        `,
    );
}

/**
 * Fetches columns for one table in physical order.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Ordered table columns.
 */
async function fetchTableColumns(client: Client, tableReference: TableReference): Promise<Array<TableColumn>> {
    const { rows } = await client.query<TableColumn>(
        `
            SELECT
                attribute.attname AS "columnName",
                pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) AS "dataType",
                attribute.attnotnull AS "isNotNull",
                pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid) AS "defaultExpression",
                attribute.attidentity AS "identityKind",
                attribute.attgenerated AS "generatedKind"
            FROM pg_catalog.pg_attribute AS attribute
            INNER JOIN pg_catalog.pg_class AS relation
                ON relation.oid = attribute.attrelid
            INNER JOIN pg_catalog.pg_namespace AS namespace
                ON namespace.oid = relation.relnamespace
            LEFT JOIN pg_catalog.pg_attrdef AS default_value
                ON default_value.adrelid = attribute.attrelid
                AND default_value.adnum = attribute.attnum
            WHERE namespace.nspname = $1
              AND relation.relname = $2
              AND attribute.attnum > 0
              AND NOT attribute.attisdropped
            ORDER BY attribute.attnum
        `,
        [tableReference.schemaName, tableReference.tableName],
    );
    return rows;
}

/**
 * Fetches table constraints for CREATE TABLE statement.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Ordered constraint definitions.
 */
async function fetchTableConstraints(client: Client, tableReference: TableReference): Promise<Array<TableConstraint>> {
    const { rows } = await client.query<TableConstraint>(
        `
            SELECT
                constraint_data.conname AS "constraintName",
                pg_catalog.pg_get_constraintdef(constraint_data.oid, true) AS "constraintDefinition"
            FROM pg_catalog.pg_constraint AS constraint_data
            INNER JOIN pg_catalog.pg_class AS relation
                ON relation.oid = constraint_data.conrelid
            INNER JOIN pg_catalog.pg_namespace AS namespace
                ON namespace.oid = relation.relnamespace
            WHERE namespace.nspname = $1
              AND relation.relname = $2
            ORDER BY
                CASE constraint_data.contype
                    WHEN 'p' THEN 1
                    WHEN 'u' THEN 2
                    WHEN 'f' THEN 3
                    WHEN 'c' THEN 4
                    ELSE 5
                END,
                constraint_data.conname
        `,
        [tableReference.schemaName, tableReference.tableName],
    );
    return rows;
}

/**
 * Fetches index names that are automatically created by constraints.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Set of index names to skip from standalone index export.
 */
async function fetchConstraintBackedIndexNames(
    client: Client,
    tableReference: TableReference,
): Promise<Set<string>> {
    const { rows } = await client.query<{ readonly indexName: string }>(
        `
            SELECT
                index_relation.relname AS "indexName"
            FROM pg_catalog.pg_constraint AS constraint_data
            INNER JOIN pg_catalog.pg_class AS relation
                ON relation.oid = constraint_data.conrelid
            INNER JOIN pg_catalog.pg_namespace AS namespace
                ON namespace.oid = relation.relnamespace
            INNER JOIN pg_catalog.pg_class AS index_relation
                ON index_relation.oid = constraint_data.conindid
            WHERE namespace.nspname = $1
              AND relation.relname = $2
              AND constraint_data.conindid <> 0
        `,
        [tableReference.schemaName, tableReference.tableName],
    );
    return new Set(rows.map((row) => row.indexName));
}

/**
 * Fetches standalone indexes defined for a table.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Index DDL statements.
 */
async function fetchTableIndexes(client: Client, tableReference: TableReference): Promise<Array<TableIndex>> {
    const { rows } = await client.query<TableIndex>(
        `
            SELECT
                indexname AS "indexName",
                indexdef AS "indexDefinition"
            FROM pg_catalog.pg_indexes
            WHERE schemaname = $1
              AND tablename = $2
            ORDER BY indexname
        `,
        [tableReference.schemaName, tableReference.tableName],
    );
    return rows;
}

/**
 * Fetches non-internal trigger definitions for a table.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Trigger DDL statements.
 */
async function fetchTableTriggers(client: Client, tableReference: TableReference): Promise<Array<TableTrigger>> {
    const { rows } = await client.query<TableTrigger>(
        `
            SELECT
                trigger_data.tgname AS "triggerName",
                pg_catalog.pg_get_triggerdef(trigger_data.oid, true) AS "triggerDefinition"
            FROM pg_catalog.pg_trigger AS trigger_data
            INNER JOIN pg_catalog.pg_class AS relation
                ON relation.oid = trigger_data.tgrelid
            INNER JOIN pg_catalog.pg_namespace AS namespace
                ON namespace.oid = relation.relnamespace
            WHERE namespace.nspname = $1
              AND relation.relname = $2
              AND NOT trigger_data.tgisinternal
            ORDER BY trigger_data.tgname
        `,
        [tableReference.schemaName, tableReference.tableName],
    );
    return rows;
}

/**
 * Fetches primary-key columns to make exported data deterministic.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Ordered primary key column names.
 */
async function fetchTablePrimaryKeyColumns(
    client: Client,
    tableReference: TableReference,
): Promise<Array<string>> {
    const { rows } = await client.query<{ readonly columnName: string }>(
        `
            SELECT
                attribute.attname AS "columnName"
            FROM pg_catalog.pg_constraint AS constraint_data
            INNER JOIN pg_catalog.pg_class AS relation
                ON relation.oid = constraint_data.conrelid
            INNER JOIN pg_catalog.pg_namespace AS namespace
                ON namespace.oid = relation.relnamespace
            INNER JOIN LATERAL unnest(constraint_data.conkey) WITH ORDINALITY AS key_data(attnum, ordinality)
                ON true
            INNER JOIN pg_catalog.pg_attribute AS attribute
                ON attribute.attrelid = relation.oid
                AND attribute.attnum = key_data.attnum
            WHERE namespace.nspname = $1
              AND relation.relname = $2
              AND constraint_data.contype = 'p'
            ORDER BY key_data.ordinality
        `,
        [tableReference.schemaName, tableReference.tableName],
    );

    return rows.map((row) => row.columnName);
}

/**
 * Fetches all table rows with each value cast to text for robust CSV export.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @param tableColumns Ordered table columns.
 * @param tablePrimaryKeyColumns Ordered primary-key columns for deterministic output.
 * @returns Rows keyed by column names with text-or-null values.
 */
async function fetchTableRowsAsText(
    client: Client,
    tableReference: TableReference,
    tableColumns: ReadonlyArray<TableColumn>,
    tablePrimaryKeyColumns: ReadonlyArray<string>,
): Promise<Array<Record<string, string | null>>> {
    const selectedColumnsSql = tableColumns
        .map((tableColumn) => `${quoteIdentifier(tableColumn.columnName)}::text AS ${quoteIdentifier(tableColumn.columnName)}`)
        .join(', ');
    const orderBySql =
        tablePrimaryKeyColumns.length > 0
            ? ` ORDER BY ${tablePrimaryKeyColumns.map((columnName) => quoteIdentifier(columnName)).join(', ')}`
            : '';
    const tableIdentifier = quoteQualifiedIdentifier(tableReference.schemaName, tableReference.tableName);
    const query = `SELECT ${selectedColumnsSql} FROM ${tableIdentifier}${orderBySql}`;
    const { rows } = await client.query<Record<string, string | null>>(query);
    return rows;
}

/**
 * Resolves table-owned sequences from `nextval` default expressions.
 *
 * Identity columns are skipped because their sequence is created by `GENERATED ... AS IDENTITY`.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @param tableColumns Ordered table columns.
 * @returns Sequence metadata for serial-like defaults.
 */
async function fetchTableSequences(
    client: Client,
    tableReference: TableReference,
    tableColumns: ReadonlyArray<TableColumn>,
): Promise<Array<TableSequence>> {
    const sequences: Array<TableSequence> = [];
    const dedupe = new Set<string>();

    for (const tableColumn of tableColumns) {
        if (tableColumn.identityKind !== '') {
            continue;
        }
        if (!tableColumn.defaultExpression) {
            continue;
        }

        const sequenceReference = parseNextvalSequenceReference(tableColumn.defaultExpression, tableReference.schemaName);
        if (!sequenceReference) {
            continue;
        }

        const sequenceKey = `${sequenceReference.sequenceSchemaName}.${sequenceReference.sequenceName}`;
        if (dedupe.has(sequenceKey)) {
            continue;
        }
        dedupe.add(sequenceKey);

        const sequenceMetadata = await fetchSequenceMetadata(client, sequenceReference.sequenceSchemaName, sequenceReference.sequenceName);
        sequences.push({
            ...sequenceMetadata,
            owningColumnName: tableColumn.columnName,
        });
    }

    return sequences;
}

/**
 * Parses `nextval('schema.sequence'::regclass)` default expression into sequence reference.
 *
 * @param defaultExpression Column default expression.
 * @param fallbackSchema Fallback schema when schema is omitted in expression.
 * @returns Sequence reference or `null` when expression does not match `nextval`.
 */
function parseNextvalSequenceReference(
    defaultExpression: string,
    fallbackSchema: string,
): { readonly sequenceSchemaName: string; readonly sequenceName: string } | null {
    const match = /^nextval\('(.+)'::regclass\)$/.exec(defaultExpression);
    if (!match) {
        return null;
    }

    const regclassIdentifier = match[1];

    const quotedQualified = /^"((?:""|[^"])*)"\."((?:""|[^"])*)"$/.exec(regclassIdentifier);
    if (quotedQualified) {
        return {
            sequenceSchemaName: quotedQualified[1].replaceAll('""', '"'),
            sequenceName: quotedQualified[2].replaceAll('""', '"'),
        };
    }

    const unquotedQualified = /^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$/.exec(regclassIdentifier);
    if (unquotedQualified) {
        return {
            sequenceSchemaName: unquotedQualified[1],
            sequenceName: unquotedQualified[2],
        };
    }

    const quotedSimple = /^"((?:""|[^"])*)"$/.exec(regclassIdentifier);
    if (quotedSimple) {
        return {
            sequenceSchemaName: fallbackSchema,
            sequenceName: quotedSimple[1].replaceAll('""', '"'),
        };
    }

    const unquotedSimple = /^([A-Za-z0-9_]+)$/.exec(regclassIdentifier);
    if (unquotedSimple) {
        return {
            sequenceSchemaName: fallbackSchema,
            sequenceName: unquotedSimple[1],
        };
    }

    return null;
}

/**
 * Fetches sequence metadata from `pg_sequences`.
 *
 * @param client Connected PostgreSQL client.
 * @param sequenceSchemaName Sequence schema.
 * @param sequenceName Sequence name.
 * @returns Sequence metadata required to recreate sequence state.
 */
async function fetchSequenceMetadata(
    client: Client,
    sequenceSchemaName: string,
    sequenceName: string,
): Promise<Omit<TableSequence, 'owningColumnName'>> {
    const { rows } = await client.query<Omit<TableSequence, 'owningColumnName'>>(
        `
            SELECT
                schemaname AS "sequenceSchemaName",
                sequencename AS "sequenceName",
                start_value::text AS "startValue",
                increment_by::text AS "incrementBy",
                min_value::text AS "minValue",
                max_value::text AS "maxValue",
                cache_size::text AS "cacheSize",
                cycle AS "isCycle",
                last_value::text AS "lastValue"
            FROM pg_catalog.pg_sequences
            WHERE schemaname = $1
              AND sequencename = $2
            LIMIT 1
        `,
        [sequenceSchemaName, sequenceName],
    );

    if (rows.length === 0) {
        throw new NotFoundError(`Sequence "${sequenceSchemaName}.${sequenceName}" was not found in pg_sequences.`);
    }

    return rows[0];
}

/**
 * Renders `CREATE TABLE` statement with columns and constraints.
 *
 * @param tableReference Table being exported.
 * @param tableColumns Ordered table columns.
 * @param tableConstraints Ordered constraints.
 * @returns Complete `CREATE TABLE ...` SQL statement.
 */
function renderCreateTableStatement(
    tableReference: TableReference,
    tableColumns: ReadonlyArray<TableColumn>,
    tableConstraints: ReadonlyArray<TableConstraint>,
): string {
    const tableIdentifier = quoteQualifiedIdentifier(tableReference.schemaName, tableReference.tableName);
    const columnDefinitions = tableColumns.map((tableColumn) => renderColumnDefinition(tableColumn));
    const constraintDefinitions = tableConstraints.map(
        (tableConstraint) =>
            `CONSTRAINT ${quoteIdentifier(tableConstraint.constraintName)} ${tableConstraint.constraintDefinition}`,
    );
    const statementItems = [...columnDefinitions, ...constraintDefinitions].map((statementItem) => `    ${statementItem}`);

    return spaceTrim(`
        CREATE TABLE IF NOT EXISTS ${tableIdentifier} (
        ${statementItems.join(',\n')}
        );
    `);
}

/**
 * Renders one table-column definition.
 *
 * @param tableColumn Table column metadata.
 * @returns Column definition SQL fragment.
 */
function renderColumnDefinition(tableColumn: TableColumn): string {
    const columnParts = [quoteIdentifier(tableColumn.columnName), tableColumn.dataType];

    if (tableColumn.generatedKind === 's' && tableColumn.defaultExpression) {
        columnParts.push(`GENERATED ALWAYS AS (${tableColumn.defaultExpression}) STORED`);
    } else if (tableColumn.identityKind === 'a') {
        columnParts.push('GENERATED ALWAYS AS IDENTITY');
    } else if (tableColumn.identityKind === 'd') {
        columnParts.push('GENERATED BY DEFAULT AS IDENTITY');
    } else if (tableColumn.defaultExpression) {
        columnParts.push(`DEFAULT ${tableColumn.defaultExpression}`);
    }

    if (tableColumn.isNotNull) {
        columnParts.push('NOT NULL');
    }

    return columnParts.join(' ');
}

/**
 * Renders sequence creation SQL for serial-like table defaults.
 *
 * @param tableReference Table being exported.
 * @param tableSequence Sequence metadata for the table.
 * @returns Sequence SQL statements.
 */
function renderTableSequence(tableReference: TableReference, tableSequence: TableSequence): string {
    const sequenceSchemaIdentifier = quoteIdentifier(tableSequence.sequenceSchemaName);
    const sequenceIdentifier = quoteQualifiedIdentifier(tableSequence.sequenceSchemaName, tableSequence.sequenceName);
    const tableIdentifier = quoteQualifiedIdentifier(tableReference.schemaName, tableReference.tableName);
    const owningColumnIdentifier = quoteIdentifier(tableSequence.owningColumnName);
    const cycleKeyword = tableSequence.isCycle ? 'CYCLE' : 'NO CYCLE';

    return spaceTrim(`
        CREATE SCHEMA IF NOT EXISTS ${sequenceSchemaIdentifier};
        CREATE SEQUENCE IF NOT EXISTS ${sequenceIdentifier}
            INCREMENT BY ${tableSequence.incrementBy}
            MINVALUE ${tableSequence.minValue}
            MAXVALUE ${tableSequence.maxValue}
            START WITH ${tableSequence.startValue}
            CACHE ${tableSequence.cacheSize}
            ${cycleKeyword};
        ALTER SEQUENCE ${sequenceIdentifier} OWNED BY ${tableIdentifier}.${owningColumnIdentifier};
    `);
}

/**
 * Serializes one table row as CSV line for PostgreSQL COPY payload.
 *
 * @param values Row values in table-column order.
 * @returns One CSV line.
 */
function serializeCsvRow(values: ReadonlyArray<string | null>): string {
    return values.map((value) => serializeCsvField(value)).join(',');
}

/**
 * Serializes one scalar value as CSV field compatible with PostgreSQL COPY.
 *
 * @param value Value to serialize.
 * @returns CSV field payload.
 */
function serializeCsvField(value: string | null): string {
    if (value === null) {
        return COPY_NULL_TOKEN;
    }

    const mustQuote = value === COPY_NULL_TOKEN || /[",\r\n]/.test(value);
    if (!mustQuote) {
        return value;
    }

    return `"${value.replaceAll('"', '""')}"`;
}

/**
 * Converts unknown thrown values into branded backup errors.
 *
 * @param error Unknown thrown value.
 * @returns Branded error instance suitable for upper-level handling.
 */
function createBackupError(error: unknown): Error {
    if (error instanceof DatabaseError || error instanceof EnvironmentMismatchError || error instanceof NotFoundError) {
        return error;
    }

    if (error instanceof Error) {
        return new DatabaseError(error.message);
    }

    return new DatabaseError('Unknown backup failure.');
}

/**
 * Safely quotes a PostgreSQL identifier.
 *
 * @param identifier Raw identifier.
 * @returns Quoted identifier.
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
}

/**
 * Safely quotes a PostgreSQL schema-qualified identifier.
 *
 * @param schemaName Schema name.
 * @param objectName Relation/object name.
 * @returns Quoted schema-qualified identifier.
 */
function quoteQualifiedIdentifier(schemaName: string, objectName: string): string {
    return `${quoteIdentifier(schemaName)}.${quoteIdentifier(objectName)}`;
}

/**
 * Converts value into SQL string literal.
 *
 * @param value Raw string value.
 * @returns SQL-safe string literal.
 */
function toSqlStringLiteral(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}

/**
 * Ensures filesystem path segment cannot escape ZIP directory structure.
 *
 * @param value Raw segment.
 * @returns Sanitized segment.
 */
function sanitizePathSegment(value: string): string {
    return value.replace(/[\\/]/g, '_');
}

/**
 * Appends semicolon when SQL statement does not end with one.
 *
 * @param statement Raw SQL statement.
 * @returns SQL statement ending with semicolon.
 */
function appendStatementSemicolon(statement: string): string {
    const trimmed = statement.trim();
    return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
}

/**
 * Normalizes path separators for user-facing log lines.
 *
 * @param pathValue Path that may contain Windows separators.
 * @returns Path with POSIX separators.
 */
function normalizePathForLogs(pathValue: string): string {
    return pathValue.replaceAll('\\', '/');
}

/**
 * Formats file size in human-readable units.
 *
 * @param sizeInBytes File size in bytes.
 * @returns Human-readable size string.
 */
function formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
        return `${sizeInBytes} B`;
    }
    if (sizeInBytes < 1024 * 1024) {
        return `${(sizeInBytes / 1024).toFixed(2)} KiB`;
    }
    if (sizeInBytes < 1024 * 1024 * 1024) {
        return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MiB`;
    }
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}

/**
 * Left-pads integer value with zero to two digits.
 *
 * @param value Numeric value.
 * @returns Two-digit string.
 */
function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
