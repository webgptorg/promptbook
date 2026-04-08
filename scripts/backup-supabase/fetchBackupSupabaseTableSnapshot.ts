import { Client } from 'pg';
import { DatabaseError } from '../../src/errors/DatabaseError';
import { NotFoundError } from '../../src/errors/NotFoundError';
import type { TableReference } from './fetchBackupSupabaseTableReferences';

/**
 * All metadata and row data required to render one table backup SQL file.
 *
 * @private type of backupSupabase
 */
export type BackupSupabaseTableSnapshot = {
    /**
     * Physical table columns in storage order.
     */
    readonly tableColumns: ReadonlyArray<{
        readonly columnName: string;
        readonly dataType: string;
        readonly isNotNull: boolean;
        readonly defaultExpression: string | null;
        readonly identityKind: '' | 'a' | 'd';
        readonly generatedKind: '' | 's';
    }>;

    /**
     * Constraints included directly in the `CREATE TABLE` statement.
     */
    readonly tableConstraints: ReadonlyArray<{
        readonly constraintName: string;
        readonly constraintDefinition: string;
    }>;

    /**
     * Standalone index DDL statements.
     */
    readonly tableIndexes: ReadonlyArray<{
        readonly indexName: string;
        readonly indexDefinition: string;
    }>;

    /**
     * Non-internal trigger DDL statements.
     */
    readonly tableTriggers: ReadonlyArray<{
        readonly triggerName: string;
        readonly triggerDefinition: string;
    }>;

    /**
     * Exported table rows keyed by column name.
     */
    readonly tableRows: ReadonlyArray<Record<string, string | null>>;

    /**
     * Serial-like sequence metadata owned by table columns.
     */
    readonly tableSequences: ReadonlyArray<{
        readonly sequenceSchemaName: string;
        readonly sequenceName: string;
        readonly owningColumnName: string;
        readonly startValue: string;
        readonly incrementBy: string;
        readonly minValue: string;
        readonly maxValue: string;
        readonly cacheSize: string;
        readonly isCycle: boolean;
        readonly lastValue: string | null;
    }>;
};

/**
 * Column metadata used while assembling table DDL and data export.
 *
 * @private type of backupSupabase
 */
type TableColumn = BackupSupabaseTableSnapshot['tableColumns'][number];

/**
 * Constraint metadata used in `CREATE TABLE`.
 *
 * @private type of backupSupabase
 */
type TableConstraint = BackupSupabaseTableSnapshot['tableConstraints'][number];

/**
 * Index metadata for standalone indexes.
 *
 * @private type of backupSupabase
 */
type TableIndex = BackupSupabaseTableSnapshot['tableIndexes'][number];

/**
 * Trigger metadata for one table.
 *
 * @private type of backupSupabase
 */
type TableTrigger = BackupSupabaseTableSnapshot['tableTriggers'][number];

/**
 * Sequence metadata needed to recreate serial-like defaults.
 *
 * @private type of backupSupabase
 */
type TableSequence = BackupSupabaseTableSnapshot['tableSequences'][number];

/**
 * Parsed `nextval(...::regclass)` sequence reference.
 *
 * @private type of backupSupabase
 */
type SequenceReference = {
    /**
     * Schema containing the referenced sequence.
     */
    readonly sequenceSchemaName: string;

    /**
     * Sequence name inside the schema.
     */
    readonly sequenceName: string;
};

/**
 * Loads all database metadata required to render one table backup file.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Fully populated table snapshot.
 *
 * @private function of backupSupabase
 */
export async function fetchBackupSupabaseTableSnapshot(
    client: Client,
    tableReference: TableReference,
): Promise<BackupSupabaseTableSnapshot> {
    const tableColumns = await fetchTableColumns(client, tableReference);
    if (tableColumns.length === 0) {
        throw new DatabaseError(`Table "${tableReference.schemaName}.${tableReference.tableName}" has no columns.`);
    }

    const tableConstraints = await fetchTableConstraints(client, tableReference);
    const tableConstraintBackedIndexNames = await fetchConstraintBackedIndexNames(client, tableReference);
    const tableIndexes = (await fetchTableIndexes(client, tableReference)).filter(
        (tableIndex) => !tableConstraintBackedIndexNames.has(tableIndex.indexName),
    );
    const tableTriggers = await fetchTableTriggers(client, tableReference);
    const tablePrimaryKeyColumns = await fetchTablePrimaryKeyColumns(client, tableReference);
    const tableRows = await fetchTableRowsAsText(client, tableReference, tableColumns, tablePrimaryKeyColumns);
    const tableSequences = await fetchTableSequences(client, tableReference, tableColumns);

    return {
        tableColumns,
        tableConstraints,
        tableIndexes,
        tableTriggers,
        tableRows,
        tableSequences,
    };
}

/**
 * Fetches columns for one table in physical order.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Ordered table columns.
 *
 * @private function of backupSupabase
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
 * Fetches table constraints for the `CREATE TABLE` statement.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Table being exported.
 * @returns Ordered constraint definitions.
 *
 * @private function of backupSupabase
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
 * @returns Set of index names to skip from standalone export.
 *
 * @private function of backupSupabase
 */
async function fetchConstraintBackedIndexNames(client: Client, tableReference: TableReference): Promise<Set<string>> {
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
 *
 * @private function of backupSupabase
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
 *
 * @private function of backupSupabase
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
 * @returns Ordered primary-key column names.
 *
 * @private function of backupSupabase
 */
async function fetchTablePrimaryKeyColumns(client: Client, tableReference: TableReference): Promise<Array<string>> {
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
 *
 * @private function of backupSupabase
 */
async function fetchTableRowsAsText(
    client: Client,
    tableReference: TableReference,
    tableColumns: ReadonlyArray<TableColumn>,
    tablePrimaryKeyColumns: ReadonlyArray<string>,
): Promise<Array<Record<string, string | null>>> {
    const selectedColumnsSql = tableColumns
        .map(
            (tableColumn) =>
                `${quoteIdentifier(tableColumn.columnName)}::text AS ${quoteIdentifier(tableColumn.columnName)}`,
        )
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
 *
 * @private function of backupSupabase
 */
async function fetchTableSequences(
    client: Client,
    tableReference: TableReference,
    tableColumns: ReadonlyArray<TableColumn>,
): Promise<Array<TableSequence>> {
    const sequences: Array<TableSequence> = [];
    const dedupe = new Set<string>();

    for (const tableColumn of tableColumns) {
        if (tableColumn.identityKind !== '' || !tableColumn.defaultExpression) {
            continue;
        }

        const sequenceReference = parseNextvalSequenceReference(
            tableColumn.defaultExpression,
            tableReference.schemaName,
        );
        if (!sequenceReference) {
            continue;
        }

        const sequenceKey = `${sequenceReference.sequenceSchemaName}.${sequenceReference.sequenceName}`;
        if (dedupe.has(sequenceKey)) {
            continue;
        }
        dedupe.add(sequenceKey);

        const sequenceMetadata = await fetchSequenceMetadata(
            client,
            sequenceReference.sequenceSchemaName,
            sequenceReference.sequenceName,
        );
        sequences.push({
            ...sequenceMetadata,
            owningColumnName: tableColumn.columnName,
        });
    }

    return sequences;
}

/**
 * Parses `nextval('schema.sequence'::regclass)` default expression into a sequence reference.
 *
 * @param defaultExpression Column default expression.
 * @param fallbackSchema Fallback schema when schema is omitted in the expression.
 * @returns Sequence reference or `null` when the expression is not a `nextval`.
 *
 * @private function of backupSupabase
 */
function parseNextvalSequenceReference(defaultExpression: string, fallbackSchema: string): SequenceReference | null {
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
 * @returns Sequence metadata required to recreate the sequence state.
 *
 * @private function of backupSupabase
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
 * Safely quotes a PostgreSQL identifier.
 *
 * @param identifier Raw identifier.
 * @returns Quoted identifier.
 *
 * @private function of backupSupabase
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
}

/**
 * Safely quotes a PostgreSQL schema-qualified identifier.
 *
 * @param schemaName Schema name.
 * @param objectName Relation or object name.
 * @returns Quoted schema-qualified identifier.
 *
 * @private function of backupSupabase
 */
function quoteQualifiedIdentifier(schemaName: string, objectName: string): string {
    return `${quoteIdentifier(schemaName)}.${quoteIdentifier(objectName)}`;
}
