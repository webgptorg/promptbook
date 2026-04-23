import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import type { DatabaseMigrationExecutionLockMode } from './acquireMigrationExecutionLock';
import type { MigratePrefixProgressStage } from './migratePrefix';

/**
 * High-level migration stages used to explain where one migration run failed.
 *
 * @private internal utility of runDatabaseMigrations
 */
export type DatabaseMigrationFailureStage =
    | 'prepare-migration-plan'
    | 'connect-to-database'
    | 'acquire-migration-lock'
    | 'migrate-prefix';

/**
 * Snapshot of migration-run state captured when an error escapes the runner.
 *
 * @private internal utility of runDatabaseMigrations
 */
export type DatabaseMigrationFailureContext = {
    /**
     * The broad migration phase that was running when the error occurred.
     */
    stage: DatabaseMigrationFailureStage;
    /**
     * Requested `--only` migration targets before prefix expansion.
     */
    onlyTargets: ReadonlyArray<string> | null;
    /**
     * Resolved prefixes selected for the current run.
     */
    selectedPrefixes: ReadonlyArray<string>;
    /**
     * Number of SQL migration files discovered on disk.
     */
    totalMigrationFiles: number;
    /**
     * Current migration lock mode.
     */
    executionLockMode: DatabaseMigrationExecutionLockMode;
    /**
     * Current prefix being migrated, when already known.
     */
    currentPrefix?: string;
    /**
     * More detailed sub-step inside one prefix migration.
     */
    currentPrefixStage?: MigratePrefixProgressStage;
    /**
     * Current migration filename being applied, when already known.
     */
    currentMigrationFile?: string;
};

/**
 * PostgreSQL error shape exposed by the `pg` client.
 *
 * @private internal utility of runDatabaseMigrations
 */
type PostgresLikeError = Error & {
    code?: string;
    severity?: string;
    detail?: string;
    hint?: string;
    position?: string;
    internalPosition?: string;
    internalQuery?: string;
    where?: string;
    schema?: string;
    table?: string;
    column?: string;
    dataType?: string;
    constraint?: string;
    file?: string;
    line?: string;
    routine?: string;
};

/**
 * Creates one branded migration failure error enriched with migration context and PostgreSQL details.
 *
 * @param error - Original failure thrown by the migration runner.
 * @param context - Snapshot of migration progress at the time of failure.
 * @returns Branded migration error with copied PostgreSQL fields for downstream logging.
 *
 * @private internal utility of runDatabaseMigrations
 */
export function createDatabaseMigrationFailureError(
    error: unknown,
    context: DatabaseMigrationFailureContext,
): DatabaseError {
    const postgresLikeError = getPostgresLikeError(error);
    const message = spaceTrim(`
        Database migration failed while ${describeFailureStage(context.stage)}.

        ${createDatabaseMigrationFailureDetails(context, error, postgresLikeError)}
        ${createDatabaseMigrationFailureHint(context, postgresLikeError)}
    `);

    const migrationError = new DatabaseError(message);

    if (error instanceof Error) {
        Object.defineProperty(migrationError, 'cause', {
            value: error,
            enumerable: false,
            configurable: true,
            writable: true,
        });
    }

    copyPostgresLikeErrorProperties(migrationError, postgresLikeError);

    return migrationError;
}

/**
 * Creates the detailed markdown block appended to the migration failure summary.
 *
 * @param context - Snapshot of migration progress.
 * @param error - Original failure.
 * @param postgresLikeError - PostgreSQL-flavored view of the original failure.
 * @returns Markdown details section.
 *
 * @private internal utility of runDatabaseMigrations
 */
function createDatabaseMigrationFailureDetails(
    context: DatabaseMigrationFailureContext,
    error: unknown,
    postgresLikeError: PostgresLikeError | null,
): string {
    const detailLines = [
        `-   **Stage:** ${formatCode(describeFailureStage(context.stage))}`,
        `-   **Execution lock mode:** ${formatCode(context.executionLockMode)}`,
        context.onlyTargets && context.onlyTargets.length > 0
            ? `-   **Requested targets:** ${formatCodeList(context.onlyTargets)}`
            : null,
        context.selectedPrefixes.length > 0
            ? `-   **Selected prefixes:** ${formatCodeList(context.selectedPrefixes.map(formatPrefixForLogs))}`
            : '-   **Selected prefixes:** _not resolved yet_',
        context.totalMigrationFiles > 0
            ? `-   **Migration files discovered:** ${formatCode(String(context.totalMigrationFiles))}`
            : null,
        context.currentPrefix !== undefined
            ? `-   **Current prefix:** ${formatCode(formatPrefixForLogs(context.currentPrefix))}`
            : null,
        context.currentPrefixStage !== undefined
            ? `-   **Current prefix step:** ${formatCode(describePrefixStage(context.currentPrefixStage))}`
            : null,
        context.currentMigrationFile
            ? `-   **Current migration file:** ${formatCode(context.currentMigrationFile)}`
            : null,
        error instanceof Error ? `-   **Original error:** ${formatCode(error.message)}` : `-   **Original error:** ${formatCode(String(error))}`,
        postgresLikeError?.code ? `-   **PostgreSQL code:** ${formatCode(postgresLikeError.code)}` : null,
        postgresLikeError?.severity ? `-   **PostgreSQL severity:** ${formatCode(postgresLikeError.severity)}` : null,
        postgresLikeError?.detail ? `-   **PostgreSQL detail:** ${formatCode(postgresLikeError.detail)}` : null,
        postgresLikeError?.hint ? `-   **PostgreSQL hint:** ${formatCode(postgresLikeError.hint)}` : null,
        postgresLikeError?.where ? `-   **PostgreSQL where:** ${formatCode(postgresLikeError.where)}` : null,
        postgresLikeError?.schema ? `-   **PostgreSQL schema:** ${formatCode(postgresLikeError.schema)}` : null,
        postgresLikeError?.table ? `-   **PostgreSQL table:** ${formatCode(postgresLikeError.table)}` : null,
        postgresLikeError?.column ? `-   **PostgreSQL column:** ${formatCode(postgresLikeError.column)}` : null,
        postgresLikeError?.constraint ? `-   **PostgreSQL constraint:** ${formatCode(postgresLikeError.constraint)}` : null,
        postgresLikeError?.file ? `-   **PostgreSQL file:** ${formatCode(postgresLikeError.file)}` : null,
        postgresLikeError?.line ? `-   **PostgreSQL line:** ${formatCode(postgresLikeError.line)}` : null,
        postgresLikeError?.routine ? `-   **PostgreSQL routine:** ${formatCode(postgresLikeError.routine)}` : null,
    ].filter((detailLine): detailLine is string => detailLine !== null);

    return detailLines.join('\n');
}

/**
 * Creates extra actionable guidance for common migration failures.
 *
 * @param context - Snapshot of migration progress.
 * @param postgresLikeError - PostgreSQL-flavored view of the original failure.
 * @returns Optional markdown hint block.
 *
 * @private internal utility of runDatabaseMigrations
 */
function createDatabaseMigrationFailureHint(
    context: DatabaseMigrationFailureContext,
    postgresLikeError: PostgresLikeError | null,
): string {
    if (isMigrationLockStatementTimeout(context, postgresLikeError)) {
        return spaceTrim(`
            **Likely cause:** Another process is already running database migrations, so PostgreSQL kept this command blocked inside ${formatCode('pg_advisory_lock(...)')} until ${formatCode('statement_timeout')} canceled the wait.

            **What to check next:**
            -   Wait for the other migration to finish and rerun this command.
            -   Inspect active PostgreSQL sessions holding the advisory migration lock.
            -   Increase ${formatCode('statement_timeout')} for this manual migration session if the wait is expected.
        `);
    }

    return '';
}

/**
 * Detects the specific timeout caused by waiting on the shared migration advisory lock.
 *
 * @param context - Snapshot of migration progress.
 * @param postgresLikeError - PostgreSQL-flavored view of the original failure.
 * @returns `true` when the failure most likely came from timing out inside `pg_advisory_lock`.
 *
 * @private internal utility of runDatabaseMigrations
 */
function isMigrationLockStatementTimeout(
    context: DatabaseMigrationFailureContext,
    postgresLikeError: PostgresLikeError | null,
): boolean {
    if (context.stage !== 'acquire-migration-lock' || context.executionLockMode !== 'wait' || !postgresLikeError) {
        return false;
    }

    if (postgresLikeError.code === '57014') {
        return true;
    }

    return /statement timeout/i.test(postgresLikeError.message);
}

/**
 * Returns a human-readable description for one failure stage.
 *
 * @param stage - Raw failure stage.
 * @returns Human-readable stage description.
 *
 * @private internal utility of runDatabaseMigrations
 */
function describeFailureStage(stage: DatabaseMigrationFailureStage): string {
    switch (stage) {
        case 'prepare-migration-plan':
            return 'preparing the migration plan';
        case 'connect-to-database':
            return 'connecting to the database';
        case 'acquire-migration-lock':
            return 'waiting for the migration execution lock';
        case 'migrate-prefix':
            return 'migrating one database prefix';
    }
}

/**
 * Returns a human-readable description for one prefix sub-step.
 *
 * @param stage - Raw prefix stage.
 * @returns Human-readable stage description.
 *
 * @private internal utility of runDatabaseMigrations
 */
function describePrefixStage(stage: MigratePrefixProgressStage): string {
    switch (stage) {
        case 'ensure-migrations-table-schema':
            return 'ensuring the migrations table schema';
        case 'read-applied-migrations':
            return 'reading already-applied migrations';
        case 'apply-migration-file':
            return 'executing a migration file';
        case 'record-applied-migration':
            return 'recording an applied migration file';
    }
}

/**
 * Formats one prefix for logs while keeping the default namespace readable.
 *
 * @param prefix - Raw table prefix.
 * @returns Human-readable prefix label.
 *
 * @private internal utility of runDatabaseMigrations
 */
function formatPrefixForLogs(prefix: string): string {
    return prefix === '' ? '<default>' : prefix;
}

/**
 * Wraps one string as inline markdown code.
 *
 * @param value - Raw string value.
 * @returns Inline-code representation.
 *
 * @private internal utility of runDatabaseMigrations
 */
function formatCode(value: string): string {
    return `\`${value.replace(/`/g, '\\`')}\``;
}

/**
 * Formats a list of strings as inline-code items separated by commas.
 *
 * @param values - Values to format.
 * @returns Inline-code list.
 *
 * @private internal utility of runDatabaseMigrations
 */
function formatCodeList(values: ReadonlyArray<string>): string {
    return values.map(formatCode).join(', ');
}

/**
 * Narrows unknown failures to the PostgreSQL error shape when possible.
 *
 * @param error - Unknown failure value.
 * @returns PostgreSQL-like error object or `null`.
 *
 * @private internal utility of runDatabaseMigrations
 */
function getPostgresLikeError(error: unknown): PostgresLikeError | null {
    if (!(error instanceof Error)) {
        return null;
    }

    return error as PostgresLikeError;
}

/**
 * Copies useful PostgreSQL error properties onto the branded migration error.
 *
 * This keeps downstream logging compatible with the raw `pg` error shape.
 *
 * @param target - Branded migration error.
 * @param postgresLikeError - Original PostgreSQL-style error, when available.
 *
 * @private internal utility of runDatabaseMigrations
 */
function copyPostgresLikeErrorProperties(target: DatabaseError, postgresLikeError: PostgresLikeError | null): void {
    if (!postgresLikeError) {
        return;
    }

    const postgresFields = {
        code: postgresLikeError.code,
        severity: postgresLikeError.severity,
        detail: postgresLikeError.detail,
        hint: postgresLikeError.hint,
        position: postgresLikeError.position,
        internalPosition: postgresLikeError.internalPosition,
        internalQuery: postgresLikeError.internalQuery,
        where: postgresLikeError.where,
        schema: postgresLikeError.schema,
        table: postgresLikeError.table,
        column: postgresLikeError.column,
        dataType: postgresLikeError.dataType,
        constraint: postgresLikeError.constraint,
        file: postgresLikeError.file,
        line: postgresLikeError.line,
        routine: postgresLikeError.routine,
    };

    for (const [fieldName, fieldValue] of Object.entries(postgresFields)) {
        if (fieldValue === undefined) {
            continue;
        }

        Object.defineProperty(target, fieldName, {
            value: fieldValue,
            enumerable: true,
            configurable: true,
            writable: true,
        });
    }
}
