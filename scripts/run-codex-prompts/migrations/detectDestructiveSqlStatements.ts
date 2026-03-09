/**
 * Heuristic rule names used to classify potentially destructive SQL statements.
 */
export const DESTRUCTIVE_SQL_RULE = {
    DROP_TABLE: 'DROP_TABLE',
    DROP_COLUMN: 'DROP_COLUMN',
    TRUNCATE: 'TRUNCATE',
    DELETE_WITHOUT_WHERE: 'DELETE_WITHOUT_WHERE',
} as const;

/**
 * One heuristic rule key identifying a destructive SQL pattern.
 */
export type DestructiveSqlRule = (typeof DESTRUCTIVE_SQL_RULE)[keyof typeof DESTRUCTIVE_SQL_RULE];

/**
 * One destructive SQL match detected in a migration statement.
 */
export type DestructiveSqlStatementMatch = {
    /**
     * Matched destructive SQL rule key.
     */
    readonly rule: DestructiveSqlRule;
    /**
     * SQL statement that matched the heuristic rule.
     */
    readonly statement: string;
};

/**
 * SQL block-comment regex (`/* ... *\/`).
 */
const SQL_BLOCK_COMMENT_REGEX = /\/\*[\s\S]*?\*\//g;

/**
 * SQL line-comment regex (`-- ...`).
 */
const SQL_LINE_COMMENT_REGEX = /--.*$/gm;

/**
 * Detects potentially destructive SQL statements using regex-based heuristics.
 *
 * This is intentionally conservative and can produce false positives.
 *
 * @param sql SQL migration file content.
 * @returns List of destructive statement matches.
 */
export function detectDestructiveSqlStatements(sql: string): Array<DestructiveSqlStatementMatch> {
    const statements = splitSqlStatements(stripSqlComments(sql));
    const matches: Array<DestructiveSqlStatementMatch> = [];

    for (const statement of statements) {
        if (/\bDROP\s+TABLE\b/i.test(statement)) {
            matches.push({ rule: DESTRUCTIVE_SQL_RULE.DROP_TABLE, statement });
        }
        if (/\bALTER\s+TABLE\b[\s\S]*\bDROP\s+COLUMN\b/i.test(statement)) {
            matches.push({ rule: DESTRUCTIVE_SQL_RULE.DROP_COLUMN, statement });
        }
        if (/\bTRUNCATE(?:\s+TABLE)?\b/i.test(statement)) {
            matches.push({ rule: DESTRUCTIVE_SQL_RULE.TRUNCATE, statement });
        }
        if (/^\s*DELETE\s+FROM\b/i.test(statement) && !/\bWHERE\b/i.test(statement)) {
            matches.push({ rule: DESTRUCTIVE_SQL_RULE.DELETE_WITHOUT_WHERE, statement });
        }
    }

    return matches;
}

/**
 * Removes SQL comments to reduce false positives from commented-out statements.
 *
 * @param sql Raw SQL source.
 * @returns SQL without comments.
 */
function stripSqlComments(sql: string): string {
    return sql.replace(SQL_BLOCK_COMMENT_REGEX, ' ').replace(SQL_LINE_COMMENT_REGEX, ' ');
}

/**
 * Splits SQL source into semicolon-delimited statements.
 *
 * @param sql SQL source without comments.
 * @returns Trimmed non-empty SQL statements.
 */
function splitSqlStatements(sql: string): Array<string> {
    return sql
        .split(';')
        .map((statement) => statement.trim())
        .filter((statement) => statement !== '');
}
