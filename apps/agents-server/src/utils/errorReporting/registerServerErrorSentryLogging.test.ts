import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';
import {
    $resetServerErrorSentryLoggingForTests,
    registerServerErrorSentryLogging,
} from './registerServerErrorSentryLogging';

const ORIGINAL_CONSOLE_ERROR = console.error;
const ORIGINAL_SENTRY_DSN = process.env.SENTRY_DSN;
const ORIGINAL_NEXT_PUBLIC_SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ORIGINAL_SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT;
const ORIGINAL_NEXT_PUBLIC_SERVER_NAME = process.env.NEXT_PUBLIC_SERVER_NAME;
const ORIGINAL_NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF;
const ORIGINAL_NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
const ORIGINAL_NEXT_PUBLIC_VERCEL_TARGET_ENV = process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV;
const ORIGINAL_NEXT_RUNTIME = process.env.NEXT_RUNTIME;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_NPM_PACKAGE_VERSION = process.env.npm_package_version;
const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;
const ORIGINAL_VERCEL_REGION = process.env.VERCEL_REGION;
const ORIGINAL_VERCEL_URL = process.env.VERCEL_URL;
const ORIGINAL_FETCH = globalThis.fetch;
const MOCK_SENTRY_DSN = 'https://public@example.ingest.sentry.io/123456';

describe('registerServerErrorSentryLogging', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        Reflect.set(process.env, 'SENTRY_DSN', MOCK_SENTRY_DSN);
        Reflect.set(process.env, 'SENTRY_ENVIRONMENT', 'staging');
        Reflect.set(process.env, 'NEXT_PUBLIC_SERVER_NAME', 'Promptbook Test Server');
        Reflect.set(process.env, 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF', 'feature/sentry-details');
        Reflect.set(process.env, 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'abcdef123456');
        Reflect.set(process.env, 'NEXT_PUBLIC_VERCEL_TARGET_ENV', 'staging');
        Reflect.set(process.env, 'NEXT_RUNTIME', 'nodejs');
        Reflect.set(process.env, 'NODE_ENV', 'production');
        Reflect.set(process.env, 'npm_package_version', '0.112.0-test');
        Reflect.set(process.env, 'VERCEL_ENV', 'production');
        Reflect.set(process.env, 'VERCEL_REGION', 'fra1');
        Reflect.set(process.env, 'VERCEL_URL', 'promptbook.example.vercel.app');
    });

    afterEach(() => {
        $resetServerErrorSentryLoggingForTests();
        console.error = ORIGINAL_CONSOLE_ERROR;
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnvironmentVariable('SENTRY_DSN', ORIGINAL_SENTRY_DSN);
        restoreEnvironmentVariable('NEXT_PUBLIC_SENTRY_DSN', ORIGINAL_NEXT_PUBLIC_SENTRY_DSN);
        restoreEnvironmentVariable('SENTRY_ENVIRONMENT', ORIGINAL_SENTRY_ENVIRONMENT);
        restoreEnvironmentVariable('NEXT_PUBLIC_SERVER_NAME', ORIGINAL_NEXT_PUBLIC_SERVER_NAME);
        restoreEnvironmentVariable('NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF', ORIGINAL_NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF);
        restoreEnvironmentVariable('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', ORIGINAL_NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
        restoreEnvironmentVariable('NEXT_PUBLIC_VERCEL_TARGET_ENV', ORIGINAL_NEXT_PUBLIC_VERCEL_TARGET_ENV);
        restoreEnvironmentVariable('NEXT_RUNTIME', ORIGINAL_NEXT_RUNTIME);
        restoreEnvironmentVariable('NODE_ENV', ORIGINAL_NODE_ENV);
        restoreEnvironmentVariable('npm_package_version', ORIGINAL_NPM_PACKAGE_VERSION);
        restoreEnvironmentVariable('VERCEL_ENV', ORIGINAL_VERCEL_ENV);
        restoreEnvironmentVariable('VERCEL_REGION', ORIGINAL_VERCEL_REGION);
        restoreEnvironmentVariable('VERCEL_URL', ORIGINAL_VERCEL_URL);
    });

    it('forwards structured server errors to Sentry while preserving the original console.error call', async () => {
        const fetchMock = createSuccessfulFetchMock();
        globalThis.fetch = fetchMock as unknown as typeof fetch;
        const originalConsoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        registerServerErrorSentryLogging();

        console.error('[user-chat-job] failed', {
            taskId: 'task-123',
            error: {
                name: 'TimeoutError',
                message: 'Job timed out',
                stack: 'TimeoutError: Job timed out',
            },
        });

        await waitForMicrotaskQueue();

        expect(originalConsoleErrorSpy).toHaveBeenCalledWith('[user-chat-job] failed', {
            taskId: 'task-123',
            error: {
                name: 'TimeoutError',
                message: 'Job timed out',
                stack: 'TimeoutError: Job timed out',
            },
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [requestedUrl, requestInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
        const sentryPayload = JSON.parse(String(requestInit.body)) as Record<string, unknown>;

        expect(String(requestedUrl)).toBe(
            'https://example.ingest.sentry.io/api/123456/store/?sentry_key=public&sentry_version=7',
        );
        expect(requestInit.method).toBe('POST');
        expect(sentryPayload).toMatchObject({
            level: 'error',
            logger: 'agents-server.server-error',
            message: '[user-chat-job] failed Job timed out',
            release: 'promptbook-agents-server@0.112.0-test+abcdef123456',
            environment: 'staging',
            server_name: 'Promptbook Test Server',
            tags: {
                source: 'agents-server.console-error',
                promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                bookLanguageVersion: BOOK_LANGUAGE_VERSION,
                appPackageVersion: '0.112.0-test',
                commitHash: 'abcdef123456',
                repositoryBranch: 'feature/sentry-details',
                deploymentEnvironment: 'staging',
                vercelEnvironment: 'production',
                targetEnvironment: 'staging',
                nextRuntime: 'nodejs',
                nodeEnvironment: 'production',
                vercelRegion: 'fra1',
            },
            exception: {
                values: [
                    {
                        type: 'TimeoutError',
                        value: 'Job timed out',
                    },
                ],
            },
            extra: {
                errorStack: 'TimeoutError: Job timed out',
                agentsServer: {
                    versions: expect.objectContaining({
                        promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                        bookLanguageVersion: BOOK_LANGUAGE_VERSION,
                        appPackageVersion: '0.112.0-test',
                    }),
                    deployment: expect.objectContaining({
                        environment: 'staging',
                        vercelEnvironment: 'production',
                        vercelUrl: 'promptbook.example.vercel.app',
                        vercelRegion: 'fra1',
                    }),
                    git: expect.objectContaining({
                        commitHash: 'abcdef123456',
                        branch: 'feature/sentry-details',
                    }),
                    runtime: expect.objectContaining({
                        nodeVersion: process.version,
                        nodeEnvironment: 'production',
                        nextRuntime: 'nodejs',
                    }),
                    memory: expect.objectContaining({
                        rssBytes: expect.any(Number),
                        heapUsedBytes: expect.any(Number),
                    }),
                },
            },
        });
        expect((sentryPayload.extra as { consoleArguments: string[] }).consoleArguments).toEqual(
            expect.arrayContaining([
                '[user-chat-job] failed',
                expect.stringContaining("taskId: 'task-123'"),
                expect.stringContaining("name: 'TimeoutError'"),
            ]),
        );
    });

    it('registers the bridge only once even when startup hooks run multiple times', async () => {
        const fetchMock = createSuccessfulFetchMock();
        globalThis.fetch = fetchMock as unknown as typeof fetch;
        const originalConsoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        registerServerErrorSentryLogging();
        registerServerErrorSentryLogging();

        console.error('Only one bridge should run');

        await waitForMicrotaskQueue();

        expect(originalConsoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('keeps logging locally when Sentry is not configured', async () => {
        delete process.env.SENTRY_DSN;
        delete process.env.NEXT_PUBLIC_SENTRY_DSN;
        const fetchMock = jest.fn(async () => {
            throw new Error('Fetch should not run when Sentry DSN is missing.');
        }) as jest.MockedFunction<typeof fetch>;
        globalThis.fetch = fetchMock as unknown as typeof fetch;
        const originalConsoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        registerServerErrorSentryLogging();

        console.error('Missing DSN should not block local logging');

        await waitForMicrotaskQueue();

        expect(originalConsoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

/**
 * Waits for one promise turn so fire-and-forget reporting settles inside assertions.
 *
 * @returns Promise resolved on the next microtask turn.
 */
async function waitForMicrotaskQueue(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

/**
 * Creates one successful mocked `fetch` implementation for Sentry store requests.
 *
 * @returns Mocked `fetch` function resolving to a successful response-like object.
 */
function createSuccessfulFetchMock(): jest.MockedFunction<typeof fetch> {
    return jest.fn(async () => ({ ok: true } as Response)) as jest.MockedFunction<typeof fetch>;
}

/**
 * Restores one environment variable after test mutation.
 *
 * @param envName - Environment variable name.
 * @param value - Original value before the test changed it.
 */
function restoreEnvironmentVariable(
    envName:
        | 'SENTRY_DSN'
        | 'NEXT_PUBLIC_SENTRY_DSN'
        | 'SENTRY_ENVIRONMENT'
        | 'NEXT_PUBLIC_SERVER_NAME'
        | 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF'
        | 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'
        | 'NEXT_PUBLIC_VERCEL_TARGET_ENV'
        | 'NEXT_RUNTIME'
        | 'NODE_ENV'
        | 'npm_package_version'
        | 'VERCEL_ENV'
        | 'VERCEL_REGION'
        | 'VERCEL_URL',
    value: string | undefined,
): void {
    if (value === undefined) {
        delete process.env[envName];
        return;
    }

    Reflect.set(process.env, envName, value);
}
