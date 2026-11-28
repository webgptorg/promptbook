/**
 * Mutable SQL recorder used to capture a downloadable bootstrap script.
 *
 * @private type of createManagedServer
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
 * Creates a SQL recorder pre-populated with a descriptive transaction header.
 *
 * @param identifier - Server identifier used in comments and filenames.
 * @returns Mutable SQL recorder.
 *
 * @private function of createManagedServer
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
 * Builds one portable SQL `INSERT` statement for the downloadable transaction dump.
 *
 * @param tableName - Target table name.
 * @param values - Column/value map.
 * @returns Complete SQL insert statement.
 *
 * @private function of createManagedServer
 */
export function createInsertStatement(tableName: string, values: Record<string, unknown>): string {
    const columns = Object.keys(values).map((columnName) => quoteIdentifier(columnName));
    const literals = Object.values(values).map((value) => escapeSqlLiteral(value));

    return `INSERT INTO ${quoteIdentifier(tableName)} (${columns.join(', ')}) VALUES (${literals.join(', ')})`;
}

/**
 * Quotes a SQL identifier safely for PostgreSQL.
 *
 * @param identifier - Raw identifier.
 * @returns Quoted identifier.
 *
 * @private function of createManagedServer
 */
export function quoteIdentifier(identifier: string): string {
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
