import { $isRunningInNode } from '@promptbook-local/utils';
import { Pool } from 'pg';

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
export async function $provideClientSql(): Promise<ClientSql> {
    if (!$isRunningInNode()) {
        throw new Error('Function `$provideClientSql` can only be used in Node.js runtime.');
    }

    if (!clientPool) {
        const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('Environment variable `POSTGRES_URL` or `DATABASE_URL` must be defined.');
        }

        clientPool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
        });
    }

    return async <TRow = Array<Record<string, unknown>>>(
        templateStrings: TemplateStringsArray,
        ...templateValues: ReadonlyArray<unknown>
    ): Promise<TRow> => {
        const textChunks: Array<string> = [];
        for (let index = 0; index < templateStrings.length; index++) {
            textChunks.push(templateStrings[index]);
            if (index < templateValues.length) {
                textChunks.push(`$${index + 1}`);
            }
        }

        const text = textChunks.join('');
        const result = await clientPool!.query(text, [...templateValues]);
        return result.rows as TRow;
    };
}
