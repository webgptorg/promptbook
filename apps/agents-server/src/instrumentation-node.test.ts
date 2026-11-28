import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockEnsureAutomaticDatabaseMigrations = jest.fn() as jest.MockedFunction<() => Promise<void>>;

jest.mock('./database/ensureAutomaticDatabaseMigrations', () => ({
    ensureAutomaticDatabaseMigrations: mockEnsureAutomaticDatabaseMigrations,
}));

import { registerNodeRuntimeInstrumentation } from './instrumentation-node';

const ORIGINAL_NEXT_RUNTIME = process.env.NEXT_RUNTIME;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;
const ORIGINAL_VERCEL_REGION = process.env.VERCEL_REGION;
const ORIGINAL_VERCEL_URL = process.env.VERCEL_URL;
const ORIGINAL_SUPABASE_TABLE_PREFIX = process.env.SUPABASE_TABLE_PREFIX;

describe('registerNodeRuntimeInstrumentation', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        setEnvironmentVariable('NEXT_RUNTIME', 'nodejs');
        setEnvironmentVariable('NODE_ENV', 'production');
        setEnvironmentVariable('VERCEL_ENV', 'production');
        setEnvironmentVariable('VERCEL_REGION', 'iad1');
        setEnvironmentVariable('VERCEL_URL', 'promptbook.example.vercel.app');
        setEnvironmentVariable('SUPABASE_TABLE_PREFIX', 'server_Main_');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        restoreEnvironmentVariable('NEXT_RUNTIME', ORIGINAL_NEXT_RUNTIME);
        restoreEnvironmentVariable('NODE_ENV', ORIGINAL_NODE_ENV);
        restoreEnvironmentVariable('VERCEL_ENV', ORIGINAL_VERCEL_ENV);
        restoreEnvironmentVariable('VERCEL_REGION', ORIGINAL_VERCEL_REGION);
        restoreEnvironmentVariable('VERCEL_URL', ORIGINAL_VERCEL_URL);
        restoreEnvironmentVariable('SUPABASE_TABLE_PREFIX', ORIGINAL_SUPABASE_TABLE_PREFIX);
    });

    it('logs structured database details and keeps startup alive when automatic migrations fail', async () => {
        mockEnsureAutomaticDatabaseMigrations.mockRejectedValueOnce(
            Object.assign(new Error('canceling statement due to statement timeout'), {
                code: '57014',
                severity: 'ERROR',
                detail: 'statement timeout',
                file: 'postgres.c',
                routine: 'ProcessInterrupts',
            }),
        );

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await expect(registerNodeRuntimeInstrumentation()).resolves.toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Automatic database migration failed during Agents Server instrumentation'),
            expect.objectContaining({
                prefix: 'server_Main_',
                nextRuntime: 'nodejs',
                nodeEnv: 'production',
                vercelEnv: 'production',
                vercelRegion: 'iad1',
                vercelUrl: 'promptbook.example.vercel.app',
                errorMessage: 'canceling statement due to statement timeout',
                postgresCode: '57014',
                postgresSeverity: 'ERROR',
                postgresDetail: 'statement timeout',
                postgresFile: 'postgres.c',
                postgresRoutine: 'ProcessInterrupts',
            }),
        );
    });
});

/**
 * Restores one environment variable after test mutation.
 *
 * @param envName - Environment variable name.
 * @param value - Original value before the test changed it.
 */
function restoreEnvironmentVariable(
    envName:
        | 'NEXT_RUNTIME'
        | 'NODE_ENV'
        | 'VERCEL_ENV'
        | 'VERCEL_REGION'
        | 'VERCEL_URL'
        | 'SUPABASE_TABLE_PREFIX',
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
    envName:
        | 'NEXT_RUNTIME'
        | 'NODE_ENV'
        | 'VERCEL_ENV'
        | 'VERCEL_REGION'
        | 'VERCEL_URL'
        | 'SUPABASE_TABLE_PREFIX',
    value: string,
): void {
    Reflect.set(process.env, envName, value);
}
