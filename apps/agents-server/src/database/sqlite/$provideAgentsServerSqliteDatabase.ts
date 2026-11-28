import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { resolveAgentsServerSqliteDatabasePath } from './resolveAgentsServerSqliteDatabasePath';
import { resolveServerSqliteDatabasePath } from './resolveServerSqliteDatabasePath';

/**
 * Shape of the `better-sqlite3` module constructor loaded at runtime.
 *
 * @private internal SQLite utility of Agents Server
 */
export type BetterSqliteConstructor = new (path: string) => AgentsServerSqliteDatabase;

/**
 * Minimal `better-sqlite3` database surface shared by Agents Server SQLite utilities.
 *
 * @private internal SQLite utility of Agents Server
 */
export type AgentsServerSqliteDatabase = {
    readonly pragma: (source: string) => unknown;
    readonly exec: (source: string) => void;
    readonly prepare: (source: string) => AgentsServerSqliteStatement;
    readonly transaction: <TArguments extends ReadonlyArray<unknown>, TResult>(
        fn: (...args: TArguments) => TResult,
    ) => (...args: TArguments) => TResult;
    readonly close?: () => void;
};

/**
 * Minimal `better-sqlite3` prepared statement surface shared by Agents Server SQLite utilities.
 *
 * @private internal SQLite utility of Agents Server
 */
export type AgentsServerSqliteStatement = {
    readonly reader?: boolean;
    readonly all: (...values: ReadonlyArray<unknown>) => Array<Record<string, unknown>>;
    readonly get: (...values: ReadonlyArray<unknown>) => Record<string, unknown> | undefined;
    readonly run: (...values: ReadonlyArray<unknown>) => {
        readonly changes: number;
        readonly lastInsertRowid: number | bigint;
    };
};

/**
 * Cached SQLite database connections keyed by absolute database file path.
 */
const sqliteDatabaseByPath = new Map<string, AgentsServerSqliteDatabase>();

/**
 * Opens and initializes one SQLite database file, caching the connection per path.
 *
 * @param databasePath - Absolute path of the SQLite database file.
 * @returns Cached SQLite database connection.
 *
 * @private exported from Agents Server SQLite utilities
 */
export function $provideSqliteDatabaseAtPath(databasePath: string): AgentsServerSqliteDatabase {
    const cachedDatabase = sqliteDatabaseByPath.get(databasePath);
    if (cachedDatabase) {
        return cachedDatabase;
    }

    const databaseDirectory = dirname(databasePath);
    if (!existsSync(databaseDirectory)) {
        mkdirSync(databaseDirectory, { recursive: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterSqlite = require('better-sqlite3') as BetterSqliteConstructor;
    const database = new BetterSqlite(databasePath);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');

    sqliteDatabaseByPath.set(databasePath, database);
    return database;
}

/**
 * Opens the VPS-wide SQLite registry database.
 *
 * This database is owned by the super-admin and holds only VPS-level data,
 * most importantly the `_Server` table listing all servers running on this VPS.
 * Server-scoped data (agents, projects, metadata, users, ...) lives in isolated
 * per-server databases provided by `$provideServerSqliteDatabase`.
 *
 * @returns Shared VPS registry SQLite database connection.
 *
 * @private exported from Agents Server SQLite utilities
 */
export function $provideVpsRegistrySqliteDatabase(): AgentsServerSqliteDatabase {
    return $provideSqliteDatabaseAtPath(resolveAgentsServerSqliteDatabasePath());
}

/**
 * Opens the isolated SQLite database of one server namespace.
 *
 * @param tablePrefix - Stable server namespace key, or an empty string for the default server.
 * @returns Per-server SQLite database connection.
 *
 * @private exported from Agents Server SQLite utilities
 */
export function $provideServerSqliteDatabase(tablePrefix: string): AgentsServerSqliteDatabase {
    return $provideSqliteDatabaseAtPath(resolveServerSqliteDatabasePath(tablePrefix));
}

/**
 * Closes all cached SQLite connections and resets adapter state for isolated tests.
 *
 * @private exported from Agents Server SQLite utilities
 */
export function $resetAgentsServerSqliteDatabaseForTests(): void {
    for (const database of sqliteDatabaseByPath.values()) {
        database.close?.();
    }
    sqliteDatabaseByPath.clear();
}
