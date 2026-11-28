import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { FederatedAgentImportConfiguration } from '../constants/federatedAgentImport';
import { importAgentWithFallback } from './importAgentWithFallback';
import { retryWithBackoff } from './retryWithBackoff';

jest.mock('./retryWithBackoff', () => ({
    retryWithBackoff: jest.fn(),
}));

/**
 * Shared retry configuration used by import fallback cache tests.
 */
const TEST_IMPORT_CONFIGURATION: FederatedAgentImportConfiguration = {
    maxAttempts: 3,
    retryDelayMs: 0,
};

/**
 * Typed retry helper mock used by the tests below.
 */
const retryWithBackoffMock = retryWithBackoff as jest.MockedFunction<typeof retryWithBackoff>;

beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
});

describe('importAgentWithFallback', () => {
    it('deduplicates concurrent failed imports for the same agent URL', async () => {
        let rejectImport!: (error: Error) => void;
        const pendingFailure = new Promise<never>((_, reject) => {
            rejectImport = reject as (error: Error) => void;
        });
        retryWithBackoffMock.mockImplementationOnce((() => pendingFailure) as unknown as typeof retryWithBackoff);

        const firstImportPromise = importAgentWithFallback(
            'https://example.com/agents/unavailable-agent',
            {},
            TEST_IMPORT_CONFIGURATION,
        );
        const secondImportPromise = importAgentWithFallback(
            'https://example.com/agents/unavailable-agent',
            {},
            TEST_IMPORT_CONFIGURATION,
        );

        expect(retryWithBackoffMock).toHaveBeenCalledTimes(1);

        rejectImport(new Error('fetch failed'));

        const [firstFallback, secondFallback] = await Promise.all([firstImportPromise, secondImportPromise]);

        expect(firstFallback).toBe(secondFallback);
        expect(firstFallback).toContain('https://example.com/agents/unavailable-agent');
    });

    it('reuses the cached fallback after one failed import', async () => {
        retryWithBackoffMock.mockRejectedValueOnce(new Error('fetch failed'));

        const firstFallback = await importAgentWithFallback(
            'https://example.com/agents/reused-fallback',
            {},
            TEST_IMPORT_CONFIGURATION,
        );
        const secondFallback = await importAgentWithFallback(
            'https://example.com/agents/reused-fallback',
            {},
            TEST_IMPORT_CONFIGURATION,
        );

        expect(retryWithBackoffMock).toHaveBeenCalledTimes(1);
        expect(firstFallback).toBe(secondFallback);
    });

    it('retries again after the failed-import fallback cache expires', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));

        retryWithBackoffMock.mockRejectedValueOnce(new Error('first failure'));
        await importAgentWithFallback(
            'https://example.com/agents/expired-fallback',
            {},
            TEST_IMPORT_CONFIGURATION,
        );

        jest.advanceTimersByTime(60_001);

        retryWithBackoffMock.mockRejectedValueOnce(new Error('second failure'));
        await importAgentWithFallback(
            'https://example.com/agents/expired-fallback',
            {},
            TEST_IMPORT_CONFIGURATION,
        );

        expect(retryWithBackoffMock).toHaveBeenCalledTimes(2);
    });
});
