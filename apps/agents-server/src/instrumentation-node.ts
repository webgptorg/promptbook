import { ensureAutomaticDatabaseMigrations } from './database/ensureAutomaticDatabaseMigrations';

/**
 * Runs Node.js-only startup hooks for the Agents Server runtime.
 *
 * @returns Promise that resolves after all startup hooks finish.
 * @private internal startup hook for Agents Server runtime
 */
export async function registerNodeRuntimeInstrumentation(): Promise<void> {
    try {
        await ensureAutomaticDatabaseMigrations();
    } catch (error) {
        console.error(
            '❌ Automatic database migration failed during Agents Server instrumentation. Continuing without blocking request handling.',
            createAutomaticMigrationFailureLogContext(error),
        );
    }

    const { startSelfHostedAgentsServerWorkers } = await import('./utils/selfHostedAgentsServerWorkers');
    startSelfHostedAgentsServerWorkers();
}

/**
 * PostgreSQL error shape exposed by the `pg` client.
 *
 * @private internal logging helper for Agents Server instrumentation
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
 * Creates structured log context for startup migration failures so production logs retain the useful PostgreSQL fields.
 *
 * @param error - Unknown startup error.
 * @returns Structured log object safe to print to console.
 *
 * @private internal logging helper for Agents Server instrumentation
 */
function createAutomaticMigrationFailureLogContext(error: unknown): Record<string, unknown> {
    const defaultPrefix = process.env.SUPABASE_TABLE_PREFIX || '';
    const errorContext: Record<string, unknown> = {
        prefix: defaultPrefix,
        nextRuntime: process.env.NEXT_RUNTIME,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        vercelRegion: process.env.VERCEL_REGION,
        vercelUrl: process.env.VERCEL_URL,
    };

    if (error instanceof Error) {
        errorContext.errorName = error.name;
        errorContext.errorMessage = error.message;
        errorContext.errorStack = error.stack;
    } else {
        errorContext.errorValue = error;
    }

    const postgresLikeError = error as Partial<PostgresLikeError> | null;

    if (!postgresLikeError || typeof postgresLikeError !== 'object') {
        return errorContext;
    }

    for (const [key, value] of Object.entries({
        postgresCode: postgresLikeError.code,
        postgresSeverity: postgresLikeError.severity,
        postgresDetail: postgresLikeError.detail,
        postgresHint: postgresLikeError.hint,
        postgresPosition: postgresLikeError.position,
        postgresInternalPosition: postgresLikeError.internalPosition,
        postgresInternalQuery: postgresLikeError.internalQuery,
        postgresWhere: postgresLikeError.where,
        postgresSchema: postgresLikeError.schema,
        postgresTable: postgresLikeError.table,
        postgresColumn: postgresLikeError.column,
        postgresDataType: postgresLikeError.dataType,
        postgresConstraint: postgresLikeError.constraint,
        postgresFile: postgresLikeError.file,
        postgresLine: postgresLikeError.line,
        postgresRoutine: postgresLikeError.routine,
    })) {
        if (value !== undefined) {
            errorContext[key] = value;
        }
    }

    return errorContext;
}
