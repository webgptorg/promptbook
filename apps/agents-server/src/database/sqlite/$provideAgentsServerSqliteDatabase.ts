import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { resolveAgentsServerSqliteDatabasePath } from './resolveAgentsServerSqliteDatabasePath';

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
 * Cached SQLite database connection.
 */
let agentsServerSqliteDatabase: AgentsServerSqliteDatabase | null = null;

/**
 * Opens and initializes the shared local SQLite database.
 *
 * @returns Shared SQLite database connection.
 *
 * @private exported from Agents Server SQLite utilities
 */
export function $provideAgentsServerSqliteDatabase(): AgentsServerSqliteDatabase {
    if (agentsServerSqliteDatabase) {
        return agentsServerSqliteDatabase;
    }

    const databasePath = resolveAgentsServerSqliteDatabasePath();
    const databaseDirectory = dirname(databasePath);

    if (!existsSync(databaseDirectory)) {
        mkdirSync(databaseDirectory, { recursive: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterSqlite = require('better-sqlite3') as BetterSqliteConstructor;
    agentsServerSqliteDatabase = new BetterSqlite(databasePath);
    agentsServerSqliteDatabase.pragma('journal_mode = WAL');
    agentsServerSqliteDatabase.pragma('foreign_keys = ON');

    return agentsServerSqliteDatabase;
}

/**
 * Closes the cached SQLite connection and resets adapter state for isolated tests.
 *
 * @private exported from Agents Server SQLite utilities
 */
export function $resetAgentsServerSqliteDatabaseForTests(): void {
    agentsServerSqliteDatabase?.close?.();
    agentsServerSqliteDatabase = null;
}
