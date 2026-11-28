import { spaceTrim } from '../../src/utils/organization/spaceTrim';
import type { BackupSupabaseTableSnapshot } from './fetchBackupSupabaseTableSnapshot';
import type { TableReference } from './fetchBackupSupabaseTableReferences';

/**
 * CSV token used by PostgreSQL `COPY ... NULL`.
 *
 * @private constant of backupSupabase
 */
const BACKUP_SUPABASE_COPY_NULL_TOKEN = '\\N';

/**
 * Renders a complete SQL backup file for one table from preloaded metadata and data.
 *
 * @param tableReference Table being exported.
 * @param snapshot Preloaded table metadata and row data.
 * @returns SQL file text.
 *
 * @private function of backupSupabase
 */
export function renderBackupSupabaseTableSql(
    tableReference: TableReference,
    snapshot: BackupSupabaseTableSnapshot,
): string {
    const tableIdentifier = quoteQualifiedIdentifier(tableReference.schemaName, tableReference.tableName);
    const tableSchemaIdentifier = quoteIdentifier(tableReference.schemaName);
    const copyColumnList = snapshot.tableColumns.map((column) => quoteIdentifier(column.columnName)).join(', ');
    const copyRows = snapshot.tableRows
        .map((tableRow) => serializeCsvRow(snapshot.tableColumns.map((column) => tableRow[column.columnName] ?? null)))
        .join('\n');
    const sequenceDefinitionSql = snapshot.tableSequences
        .map((tableSequence) => renderTableSequence(tableReference, tableSequence))
        .join('\n');
    const createTableSql = renderCreateTableStatement(tableReference, snapshot.tableColumns, snapshot.tableConstraints);
    const indexSql = snapshot.tableIndexes
        .map((tableIndex) => appendStatementSemicolon(tableIndex.indexDefinition))
        .join('\n');
    const triggerSql = snapshot.tableTriggers
        .map((tableTrigger) => appendStatementSemicolon(tableTrigger.triggerDefinition))
        .join('\n');
    const sequenceSetValueSql = snapshot.tableSequences
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
            COPY ${tableIdentifier} (${copyColumnList}) FROM stdin WITH (FORMAT csv, NULL '${BACKUP_SUPABASE_COPY_NULL_TOKEN}');
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
 * Renders a `CREATE TABLE` statement with columns and constraints.
 *
 * @param tableReference Table being exported.
 * @param tableColumns Ordered table columns.
 * @param tableConstraints Ordered constraints.
 * @returns Complete `CREATE TABLE ...` SQL statement.
 *
 * @private function of backupSupabase
 */
function renderCreateTableStatement(
    tableReference: TableReference,
    tableColumns: BackupSupabaseTableSnapshot['tableColumns'],
    tableConstraints: BackupSupabaseTableSnapshot['tableConstraints'],
): string {
    const tableIdentifier = quoteQualifiedIdentifier(tableReference.schemaName, tableReference.tableName);
    const columnDefinitions = tableColumns.map((tableColumn) => renderColumnDefinition(tableColumn));
    const constraintDefinitions = tableConstraints.map(
        (tableConstraint) =>
            `CONSTRAINT ${quoteIdentifier(tableConstraint.constraintName)} ${tableConstraint.constraintDefinition}`,
    );
    const statementItems = [...columnDefinitions, ...constraintDefinitions].map(
        (statementItem) => `    ${statementItem}`,
    );

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
 *
 * @private function of backupSupabase
 */
function renderColumnDefinition(tableColumn: BackupSupabaseTableSnapshot['tableColumns'][number]): string {
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
 *
 * @private function of backupSupabase
 */
function renderTableSequence(
    tableReference: TableReference,
    tableSequence: BackupSupabaseTableSnapshot['tableSequences'][number],
): string {
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
 * Serializes one table row as a CSV line for PostgreSQL COPY payload.
 *
 * @param values Row values in table-column order.
 * @returns One CSV line.
 *
 * @private function of backupSupabase
 */
function serializeCsvRow(values: ReadonlyArray<string | null>): string {
    return values.map((value) => serializeCsvField(value)).join(',');
}

/**
 * Serializes one scalar value as a CSV field compatible with PostgreSQL COPY.
 *
 * @param value Value to serialize.
 * @returns CSV field payload.
 *
 * @private function of backupSupabase
 */
function serializeCsvField(value: string | null): string {
    if (value === null) {
        return BACKUP_SUPABASE_COPY_NULL_TOKEN;
    }

    const mustQuote = value === BACKUP_SUPABASE_COPY_NULL_TOKEN || /[",\r\n]/.test(value);
    if (!mustQuote) {
        return value;
    }

    return `"${value.replaceAll('"', '""')}"`;
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

/**
 * Converts a value into a SQL string literal.
 *
 * @param value Raw string value.
 * @returns SQL-safe string literal.
 *
 * @private function of backupSupabase
 */
function toSqlStringLiteral(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}

/**
 * Appends a semicolon when a SQL statement does not end with one.
 *
 * @param statement Raw SQL statement.
 * @returns SQL statement ending with a semicolon.
 *
 * @private function of backupSupabase
 */
function appendStatementSemicolon(statement: string): string {
    const trimmed = statement.trim();

    return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
}
