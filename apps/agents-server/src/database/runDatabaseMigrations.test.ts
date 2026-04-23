import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DatabaseError } from '../../../../src/errors/DatabaseError';

const mockImportRuntimeModule = jest.fn() as jest.MockedFunction<(specifier: string) => Promise<unknown>>;
const mockResolveMigrationsDirectory = jest.fn() as jest.MockedFunction<() => Promise<string>>;
const mockReadMigrationFiles = jest.fn() as jest.MockedFunction<(migrationsDirectory: string) => Promise<Array<string>>>;
const mockReadMigrationFile = jest.fn() as jest.MockedFunction<
    (path: string, encoding: string) => Promise<string>
>;

jest.mock('./importRuntimeModule', () => ({
    importRuntimeModule: mockImportRuntimeModule,
}));

jest.mock('./resolveMigrationsDirectory', () => ({
    resolveMigrationsDirectory: mockResolveMigrationsDirectory,
    readMigrationFiles: mockReadMigrationFiles,
}));

import { DATABASE_MIGRATION_APPLIED_BY, runDatabaseMigrations } from './runDatabaseMigrations';

type QueryResult = {
    readonly rows: Array<Record<string, unknown>>;
};

type QueryHandler = (sql: string, values?: ReadonlyArray<unknown>) => Promise<QueryResult>;

let currentQueryHandler: QueryHandler;
const createdClients: Array<MockPostgresClient> = [];

class MockPostgresClient {
    public readonly connect = jest.fn(async () => undefined);
    public readonly end = jest.fn(async () => undefined);
    public readonly query = jest.fn(async (sql: string, values?: ReadonlyArray<unknown>) =>
        currentQueryHandler(sql, values),
    );

    public constructor(public readonly options: unknown) {
        createdClients.push(this);
    }
}

describe('runDatabaseMigrations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        createdClients.length = 0;

        mockResolveMigrationsDirectory.mockResolvedValue('/virtual/migrations');
        mockReadMigrationFiles.mockResolvedValue(['001_add_table.sql']);
        mockReadMigrationFile.mockResolvedValue('SELECT 1;');
        mockImportRuntimeModule.mockImplementation(async (specifier) => {
            if (specifier === 'pg') {
                return { Client: MockPostgresClient };
            }

            if (specifier === 'fs/promises') {
                return { readFile: mockReadMigrationFile };
            }

            throw new Error(`Unexpected runtime module import: ${specifier}`);
        });

        currentQueryHandler = async () => ({ rows: [] });
    });

    it('adds advisory-lock timeout guidance when waiting for the migration lock times out', async () => {
        currentQueryHandler = async (sql) => {
            const normalizedSql = normalizeSql(sql);

            if (normalizedSql.includes('SELECT pg_advisory_lock(hashtext($1));')) {
                throw Object.assign(new Error('canceling statement due to statement timeout'), {
                    code: '57014',
                    severity: 'ERROR',
                    detail: 'statement timeout',
                    file: 'postgres.c',
                    line: '3405',
                    routine: 'ProcessInterrupts',
                });
            }

            return { rows: [] };
        };

        const error = await getRejectedPromiseValue(
            runDatabaseMigrations({
                prefixes: ['server_Test_'],
                connectionString: 'postgres://example.test/db',
                appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
                logger: createSilentLogger(),
            }),
        );

        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as Error).message).toContain('Database migration failed while waiting for the migration execution lock.');
        expect((error as Error).message).toContain('Another process is already running database migrations');
        expect((error as Error).message).toContain('`pg_advisory_lock(...)`');
        expect((error as Error).message).toContain('`statement_timeout`');
        expect((error as Error).message).toContain('**PostgreSQL code:** `57014`');
        expect((error as Error).message).toContain('**Selected prefixes:** `server_Test_`');
        expect(error).toEqual(
            expect.objectContaining({
                code: '57014',
                detail: 'statement timeout',
                routine: 'ProcessInterrupts',
            }),
        );
        expect(createdClients[0]?.end).toHaveBeenCalledTimes(1);
    });

    it('includes prefix and migration file context when a specific migration file fails', async () => {
        mockReadMigrationFiles.mockResolvedValue(['001_add_table.sql', '002_other.sql']);
        mockReadMigrationFile.mockResolvedValue('SELECT broken_column FROM migrated_table;');

        currentQueryHandler = async (sql) => {
            const normalizedSql = normalizeSql(sql);

            if (normalizedSql.includes('SELECT pg_advisory_lock(hashtext($1));')) {
                return { rows: [] };
            }

            if (normalizedSql.includes('SELECT pg_advisory_unlock(hashtext($1));')) {
                return { rows: [] };
            }

            if (normalizedSql === 'SELECT broken_column FROM migrated_table;') {
                throw Object.assign(new Error('column "broken_column" does not exist'), {
                    code: '42703',
                    severity: 'ERROR',
                    column: 'broken_column',
                    file: 'parse_relation.c',
                    line: '3665',
                    routine: 'errorMissingColumn',
                });
            }

            if (normalizedSql === 'SELECT "filename" FROM "server_Test_Migrations"') {
                return { rows: [] };
            }

            return { rows: [] };
        };

        const error = await getRejectedPromiseValue(
            runDatabaseMigrations({
                prefixes: ['server_Test_'],
                connectionString: 'postgres://example.test/db',
                appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
                logger: createSilentLogger(),
            }),
        );

        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as Error).message).toContain('Database migration failed while migrating one database prefix.');
        expect((error as Error).message).toContain('**Current prefix:** `server_Test_`');
        expect((error as Error).message).toContain('**Current prefix step:** `executing a migration file`');
        expect((error as Error).message).toContain('**Current migration file:** `001_add_table.sql`');
        expect((error as Error).message).toContain('**PostgreSQL code:** `42703`');
        expect((error as Error).message).toContain('**PostgreSQL column:** `broken_column`');
        expect((error as Error).message).toContain('**PostgreSQL routine:** `errorMissingColumn`');
        expect(createdClients[0]?.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(hashtext($1));', [
            'promptbook_agents_server_migrations',
        ]);
    });
});

/**
 * Converts a SQL string into a stable single-line form for assertions in tests.
 *
 * @param sql - Raw SQL string.
 * @returns Normalized SQL.
 */
function normalizeSql(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim();
}

/**
 * Captures the rejection value of a promise without losing its type information to Jest matchers.
 *
 * @param promise - Promise expected to reject.
 * @returns Rejection value.
 */
async function getRejectedPromiseValue(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        return error;
    }

    throw new Error('Expected promise to reject.');
}

/**
 * Creates a logger compatible with the migration runner while keeping test output quiet.
 *
 * @returns Silent migration logger.
 */
function createSilentLogger(): Pick<Console, 'error' | 'info' | 'warn'> {
    return {
        error: () => undefined,
        info: () => undefined,
        warn: () => undefined,
    };
}
