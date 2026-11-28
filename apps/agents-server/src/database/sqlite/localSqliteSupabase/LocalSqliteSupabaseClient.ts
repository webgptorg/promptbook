import type { TODO_any } from '@promptbook-local/types';
import type { AgentsServerSqliteDatabase } from '../$provideAgentsServerSqliteDatabase';
import type { LocalSqliteTableLocation } from '../resolveLocalSqliteTableLocation';
import type { LocalSqliteSelectOptions, LocalSqliteUpsertOptions } from './localSqliteTypes';
import { LocalSqliteQueryBuilder } from './LocalSqliteQueryBuilder';

/**
 * Resolver routing one logical table name to its isolated SQLite database.
 *
 * @private type of `LocalSqliteSupabaseClient`
 */
export type LocalSqliteTableLocationResolver = (tableName: string) => LocalSqliteTableLocation;

/**
 * Supabase-shaped client with only the table query surface used by Agents Server.
 *
 * Every table access is routed through the location resolver, so each server
 * namespace transparently works with its own isolated SQLite database file.
 *
 * @private class of `$provideLocalSqliteSupabase`
 */
export class LocalSqliteSupabaseClient {
    public constructor(private readonly resolveTableLocation: LocalSqliteTableLocationResolver) {}

    /**
     * Starts a query for one logical SQLite table.
     */
    public from(tableName: string): LocalSqliteTable {
        const { database, localTableName } = this.resolveTableLocation(tableName);
        return new LocalSqliteTable(database, localTableName);
    }
}

/**
 * Supabase-shaped table entry point. Every operation starts a fresh query builder.
 *
 * @private class of `LocalSqliteSupabaseClient`
 */
class LocalSqliteTable {
    public constructor(private readonly database: AgentsServerSqliteDatabase, private readonly tableName: string) {}

    /**
     * Starts a select query.
     */
    public select(columns = '*', options?: LocalSqliteSelectOptions): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).select(columns, options);
    }

    /**
     * Starts an insert query.
     */
    public insert(values: TODO_any): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).insert(values);
    }

    /**
     * Starts an update query.
     */
    public update(values: Record<string, unknown>): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).update(values);
    }

    /**
     * Starts a delete query.
     */
    public delete(): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).delete();
    }

    /**
     * Starts an upsert query.
     */
    public upsert(values: TODO_any, options?: LocalSqliteUpsertOptions): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).upsert(values, options);
    }
}
