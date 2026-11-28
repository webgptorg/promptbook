import { $isRunningInNode } from '@promptbook-local/utils';
import { Pool } from 'pg';
import { resolvePostgresConnectionString } from './resolvePostgresConnectionString';

/**
 * SQL tagged-template executor used by server routes and utilities.
 *
 * @private internal utility of Agents Server database layer
 */
export type ClientSql = <TRow = Record<string, unknown>>(
    templateStrings: TemplateStringsArray,
    ...templateValues: ReadonlyArray<unknown>
) => Promise<TRow>;

/**
 * Raw SQL executor used when dynamic SQL identifiers (such as table names) are needed.
 *
 * @private internal utility of Agents Server database layer
 */
export type ClientSqlRaw = <TRow = Array<Record<string, unknown>>>(
    text: string,
    values?: ReadonlyArray<unknown>,
) => Promise<TRow>;

/**
 * SQL executor with both tagged-template and raw-query variants.
 *
 * @private internal utility of Agents Server database layer
 */
export type ClientSqlExecutor = ClientSql & {
    readonly raw: ClientSqlRaw;
};

/**
 * Maximum number of PostgreSQL connections in the shared pool.
 *
 * Configurable via `DATABASE_POOL_MAX` environment variable.
 * Defaults to 20 which comfortably handles concurrent chat-stream polling loads.
 *
 * @private internal constant of Agents Server database layer
 */
const DATABASE_POOL_MAX = Math.max(1, parseInt(process.env.DATABASE_POOL_MAX || '20', 10));

/**
 * Milliseconds to wait for a free pool connection before failing.
 *
 * Without a timeout the default `pg` behaviour is to queue requests indefinitely,
 * which causes the server to become unresponsive under pool exhaustion.
 *
 * @private internal constant of Agents Server database layer
 */
const POOL_CONNECTION_TIMEOUT_MS = 15_000;

/**
 * Milliseconds an idle client stays in the pool before being closed.
 *
 * @private internal constant of Agents Server database layer
 */
const POOL_IDLE_TIMEOUT_MS = 30_000;

/**
 * Shared PostgreSQL pool reused across all requests in the server process.
 *
 * @private internal singleton of Agents Server database layer
 */
let clientPool: Pool | undefined;

/**
 * Provides SQL tagged-template client for server-side PostgreSQL access.
 *
 * @private exported from Agents Server database utils
 */
export async function $provideClientSql(): Promise<ClientSqlExecutor> {
    if (!$isRunningInNode()) {
        throw new Error('Function `$provideClientSql` can only be used in Node.js runtime.');
    }

    if (!clientPool) {
        clientPool = new Pool({
            connectionString: resolvePostgresConnectionString(),
            ssl: { rejectUnauthorized: false },
            max: DATABASE_POOL_MAX,
            idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
            connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
            allowExitOnIdle: true,
        });

        // Prevent unhandled errors from crashing the pool or the process.
        // Individual query errors are still thrown at the call site.
        clientPool.on('error', (error) => {
            console.error('[database] Unexpected error on idle PostgreSQL client:', error);
        });
    }

    const executeTemplate = async <TRow = Array<Record<string, unknown>>>(
        templateStrings: TemplateStringsArray,
        ...templateValues: ReadonlyArray<unknown>
    ): Promise<TRow> => {
        const textChunks: Array<string> = [];
        for (let index = 0; index < templateStrings.length; index++) {
            textChunks.push(templateStrings[index]!);
            if (index < templateValues.length) {
                textChunks.push(`$${index + 1}`);
            }
        }

        const text = textChunks.join('');
        const result = await clientPool!.query(text, [...templateValues]);
        return result.rows as TRow;
    };

    const executeRaw: ClientSqlRaw = async <TRow = Array<Record<string, unknown>>>(
        text: string,
        values: ReadonlyArray<unknown> = [],
    ): Promise<TRow> => {
        const result = await clientPool!.query(text, [...values]);
        return result.rows as TRow;
    };

    return Object.assign(executeTemplate, { raw: executeRaw });
}
