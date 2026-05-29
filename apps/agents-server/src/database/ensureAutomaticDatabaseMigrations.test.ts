import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { RunDatabaseMigrationsResult } from './runDatabaseMigrations';

const mockResolveDatabaseMigrationConnectionStringFromEnvironment = jest.fn() as jest.MockedFunction<
    () => string | null
>;
const mockRunDatabaseMigrations = jest.fn() as jest.MockedFunction<
    (...args: Array<unknown>) => Promise<RunDatabaseMigrationsResult>
>;

jest.mock('./runDatabaseMigrations', () => ({
    DATABASE_MIGRATION_APPLIED_BY: {
        AUTOMATIC: 'AUTOMATIC',
        MANUAL: 'MANUAL',
    },
    resolveDatabaseMigrationConnectionStringFromEnvironment: mockResolveDatabaseMigrationConnectionStringFromEnvironment,
    runDatabaseMigrations: mockRunDatabaseMigrations,
}));

const SUCCESSFUL_MIGRATION_RESULT = {
    processedPrefixes: ['server_Test_'],
    totalMigrationFiles: 1,
    perPrefix: [{ prefix: 'server_Test_', appliedCount: 0 }],
    isSkippedDueToActiveMigrationLock: false,
};

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_JEST_WORKER_ID = process.env.JEST_WORKER_ID;
const ORIGINAL_NEXT_PHASE = process.env.NEXT_PHASE;
const ORIGINAL_SUPABASE_AUTO_MIGRATE = process.env.SUPABASE_AUTO_MIGRATE;
const ORIGINAL_PTBK_AGENTS_SERVER_DATABASE = process.env.PTBK_AGENTS_SERVER_DATABASE;

describe('ensureAutomaticDatabaseMigrationsForPrefix', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        setEnvironmentVariable('NODE_ENV', 'development');
        delete process.env.JEST_WORKER_ID;
        delete process.env.NEXT_PHASE;
        delete process.env.SUPABASE_AUTO_MIGRATE;
        delete process.env.PTBK_AGENTS_SERVER_DATABASE;

        mockResolveDatabaseMigrationConnectionStringFromEnvironment.mockReturnValue('postgres://example.test/db');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        restoreEnvironmentVariable('NODE_ENV', ORIGINAL_NODE_ENV);
        restoreEnvironmentVariable('JEST_WORKER_ID', ORIGINAL_JEST_WORKER_ID);
        restoreEnvironmentVariable('NEXT_PHASE', ORIGINAL_NEXT_PHASE);
        restoreEnvironmentVariable('SUPABASE_AUTO_MIGRATE', ORIGINAL_SUPABASE_AUTO_MIGRATE);
        restoreEnvironmentVariable('PTBK_AGENTS_SERVER_DATABASE', ORIGINAL_PTBK_AGENTS_SERVER_DATABASE);
    });

    it('shares one in-flight automatic migration attempt per prefix', async () => {
        let resolveMigrationAttempt: ((value: typeof SUCCESSFUL_MIGRATION_RESULT) => void) | undefined;

        mockRunDatabaseMigrations.mockReturnValueOnce(
            new Promise<typeof SUCCESSFUL_MIGRATION_RESULT>((resolve) => {
                resolveMigrationAttempt = resolve;
            }),
        );

        const { ensureAutomaticDatabaseMigrationsForPrefix } = await import('./ensureAutomaticDatabaseMigrations');

        const firstAttemptPromise = ensureAutomaticDatabaseMigrationsForPrefix('server_Test_');
        const secondAttemptPromise = ensureAutomaticDatabaseMigrationsForPrefix('server_Test_');

        expect(mockRunDatabaseMigrations).toHaveBeenCalledTimes(1);
        expect(mockRunDatabaseMigrations).toHaveBeenCalledWith(
            expect.objectContaining({
                prefixes: ['server_Test_'],
                appliedBy: 'AUTOMATIC',
                executionLockMode: 'skip',
            }),
        );

        resolveMigrationAttempt!(SUCCESSFUL_MIGRATION_RESULT);

        await expect(Promise.all([firstAttemptPromise, secondAttemptPromise])).resolves.toEqual([undefined, undefined]);
    });

    it('retries after a failed automatic migration attempt', async () => {
        mockRunDatabaseMigrations
            .mockRejectedValueOnce(new Error('canceling statement due to statement timeout'))
            .mockResolvedValueOnce(SUCCESSFUL_MIGRATION_RESULT);

        const { ensureAutomaticDatabaseMigrationsForPrefix } = await import('./ensureAutomaticDatabaseMigrations');

        await expect(ensureAutomaticDatabaseMigrationsForPrefix('server_Test_')).rejects.toThrow(
            'canceling statement due to statement timeout',
        );
        await expect(ensureAutomaticDatabaseMigrationsForPrefix('server_Test_')).resolves.toBeUndefined();

        expect(mockRunDatabaseMigrations).toHaveBeenCalledTimes(2);
    });

    it('retries after deferring to another runtime instance that already holds the migration lock', async () => {
        mockRunDatabaseMigrations
            .mockResolvedValueOnce({
                processedPrefixes: [],
                totalMigrationFiles: 1,
                perPrefix: [],
                isSkippedDueToActiveMigrationLock: true,
            })
            .mockResolvedValueOnce(SUCCESSFUL_MIGRATION_RESULT);

        const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        const { ensureAutomaticDatabaseMigrationsForPrefix } = await import('./ensureAutomaticDatabaseMigrations');

        await expect(ensureAutomaticDatabaseMigrationsForPrefix('server_Test_')).resolves.toBeUndefined();
        await expect(ensureAutomaticDatabaseMigrationsForPrefix('server_Test_')).resolves.toBeUndefined();

        expect(mockRunDatabaseMigrations).toHaveBeenCalledTimes(2);
        expect(consoleInfoSpy).toHaveBeenCalledWith(
            expect.stringContaining('already checking database migrations for prefix "server_Test_"'),
        );
    });

    it('skips automatic migrations entirely in SQLite mode', async () => {
        setEnvironmentVariable('PTBK_AGENTS_SERVER_DATABASE', 'sqlite');

        const { ensureAutomaticDatabaseMigrationsForPrefix } = await import('./ensureAutomaticDatabaseMigrations');

        await expect(ensureAutomaticDatabaseMigrationsForPrefix('server_Test_')).resolves.toBeUndefined();

        expect(mockResolveDatabaseMigrationConnectionStringFromEnvironment).not.toHaveBeenCalled();
        expect(mockRunDatabaseMigrations).not.toHaveBeenCalled();
    });
});

/**
 * Restores one environment variable after test mutation.
 *
 * @param envName - Environment variable name.
 * @param value - Original value before the test changed it.
 */
function restoreEnvironmentVariable(
    envName: 'NODE_ENV' | 'JEST_WORKER_ID' | 'NEXT_PHASE' | 'SUPABASE_AUTO_MIGRATE' | 'PTBK_AGENTS_SERVER_DATABASE',
    value: string | undefined,
): void {
    if (value === undefined) {
        delete process.env[envName];
        return;
    }

    setEnvironmentVariable(envName, value);
}

/**
 * Sets one environment variable in a way that works with the readonly Node.js typings used in tests.
 *
 * @param envName - Environment variable name.
 * @param value - Value to assign for the current test.
 */
function setEnvironmentVariable(
    envName: 'NODE_ENV' | 'JEST_WORKER_ID' | 'NEXT_PHASE' | 'SUPABASE_AUTO_MIGRATE' | 'PTBK_AGENTS_SERVER_DATABASE',
    value: string,
): void {
    Reflect.set(process.env, envName, value);
}
