import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';
import type { ApplicationErrorReportPayload } from './applicationErrorHandling';
import { sendApplicationErrorReportToSentry } from './sendApplicationErrorReportToSentry';

const ORIGINAL_SENTRY_DSN = process.env.SENTRY_DSN;
const ORIGINAL_SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT;
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

describe('sendApplicationErrorReportToSentry', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        setEnvironmentVariable('SENTRY_DSN', MOCK_SENTRY_DSN);
        setEnvironmentVariable('SENTRY_ENVIRONMENT', 'preview');
        setEnvironmentVariable('NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF', 'preview');
        setEnvironmentVariable('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'fedcba654321');
        setEnvironmentVariable('NEXT_PUBLIC_VERCEL_TARGET_ENV', 'preview');
        setEnvironmentVariable('NEXT_RUNTIME', 'nodejs');
        setEnvironmentVariable('NODE_ENV', 'production');
        setEnvironmentVariable('npm_package_version', '0.112.0-test');
        setEnvironmentVariable('VERCEL_ENV', 'preview');
        setEnvironmentVariable('VERCEL_REGION', 'iad1');
        setEnvironmentVariable('VERCEL_URL', 'promptbook-preview.example.vercel.app');
    });

    afterEach(() => {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnvironmentVariable('SENTRY_DSN', ORIGINAL_SENTRY_DSN);
        restoreEnvironmentVariable('SENTRY_ENVIRONMENT', ORIGINAL_SENTRY_ENVIRONMENT);
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

    it('adds shared Agents Server diagnostics to browser application error reports', async () => {
        const fetchMock = jest.fn(async () => ({ ok: true } as Response)) as jest.MockedFunction<typeof fetch>;
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        await sendApplicationErrorReportToSentry(createApplicationErrorReportPayload());

        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [requestedUrl, requestInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
        const sentryPayload = JSON.parse(String(requestInit.body)) as Record<string, unknown>;

        expect(String(requestedUrl)).toBe(
            'https://example.ingest.sentry.io/api/123456/store/?sentry_key=public&sentry_version=7',
        );
        expect(requestInit.method).toBe('POST');
        expect(sentryPayload).toMatchObject({
            level: 'error',
            logger: 'agents-server.application-error',
            message: 'Application crashed',
            release: 'promptbook-agents-server@0.112.0-test+fedcba654321',
            environment: 'preview',
            server_name: 'Promptbook Test Server',
            tags: {
                source: 'next-app-error-boundary',
                digest: 'digest-123',
                variant: 'advanced',
                promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                bookLanguageVersion: BOOK_LANGUAGE_VERSION,
                appPackageVersion: '0.112.0-test',
                commitHash: 'fedcba654321',
                repositoryBranch: 'preview',
                deploymentEnvironment: 'preview',
                vercelEnvironment: 'preview',
                targetEnvironment: 'preview',
                nextRuntime: 'nodejs',
                nodeEnvironment: 'production',
                vercelRegion: 'iad1',
            },
            exception: {
                values: [
                    {
                        type: 'Error',
                        value: 'Application crashed',
                    },
                ],
            },
            extra: {
                nextDigest: 'next-digest-456',
                stack: 'Error: Application crashed',
                pageUrl: 'https://promptbook.example/agents/test',
                reportedAt: '2026-06-11T10:00:00.000Z',
                agentsServer: {
                    versions: expect.objectContaining({
                        promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                        bookLanguageVersion: BOOK_LANGUAGE_VERSION,
                        appPackageVersion: '0.112.0-test',
                    }),
                    deployment: expect.objectContaining({
                        environment: 'preview',
                        vercelEnvironment: 'preview',
                        vercelUrl: 'promptbook-preview.example.vercel.app',
                        vercelRegion: 'iad1',
                    }),
                    git: expect.objectContaining({
                        commitHash: 'fedcba654321',
                        branch: 'preview',
                    }),
                    runtime: expect.objectContaining({
                        nodeVersion: process.version,
                        nodeEnvironment: 'production',
                        nextRuntime: 'nodejs',
                    }),
                },
            },
        });
    });
});

/**
 * Creates one validated browser application error report.
 *
 * @returns Application error report payload.
 */
function createApplicationErrorReportPayload(): ApplicationErrorReportPayload {
    return {
        variant: 'advanced',
        serverName: 'Promptbook Test Server',
        digest: 'digest-123',
        nextDigest: 'next-digest-456',
        errorName: 'Error',
        errorMessage: 'Application crashed',
        errorStack: 'Error: Application crashed',
        pageUrl: 'https://promptbook.example/agents/test',
        reportedAt: '2026-06-11T10:00:00.000Z',
    };
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
        | 'SENTRY_ENVIRONMENT'
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
        | 'SENTRY_DSN'
        | 'SENTRY_ENVIRONMENT'
        | 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF'
        | 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'
        | 'NEXT_PUBLIC_VERCEL_TARGET_ENV'
        | 'NEXT_RUNTIME'
        | 'NODE_ENV'
        | 'npm_package_version'
        | 'VERCEL_ENV'
        | 'VERCEL_REGION'
        | 'VERCEL_URL',
    value: string,
): void {
    Reflect.set(process.env, envName, value);
}
