import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRegisterServerErrorSentryLogging = jest.fn();
const mockRegisterNodeRuntimeInstrumentation = jest.fn() as jest.MockedFunction<() => Promise<void>>;
const mockRegisterSentryServerConfig = jest.fn();
const mockRegisterSentryEdgeConfig = jest.fn();

jest.mock('./utils/errorReporting/registerServerErrorSentryLogging', () => ({
    registerServerErrorSentryLogging: mockRegisterServerErrorSentryLogging,
}));

jest.mock('./sentry.server.config', () => {
    mockRegisterSentryServerConfig();
    return {};
});

jest.mock('./sentry.edge.config', () => {
    mockRegisterSentryEdgeConfig();
    return {};
});

jest.mock('./instrumentation-node', () => ({
    registerNodeRuntimeInstrumentation: mockRegisterNodeRuntimeInstrumentation,
}));

import { onRequestError, register } from './instrumentation';

const ORIGINAL_NEXT_RUNTIME = process.env.NEXT_RUNTIME;

describe('instrumentation.register', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        restoreEnvironmentVariable('NEXT_RUNTIME', ORIGINAL_NEXT_RUNTIME);
    });

    it('installs server error forwarding before node runtime startup hooks', async () => {
        Reflect.set(process.env, 'NEXT_RUNTIME', 'nodejs');
        mockRegisterNodeRuntimeInstrumentation.mockResolvedValueOnce();

        await register();

        expect(mockRegisterServerErrorSentryLogging).toHaveBeenCalledTimes(1);
        expect(mockRegisterNodeRuntimeInstrumentation).toHaveBeenCalledTimes(1);
        expect(mockRegisterSentryServerConfig).toHaveBeenCalledTimes(1);
        expect(mockRegisterSentryEdgeConfig).not.toHaveBeenCalled();
        expect(mockRegisterSentryServerConfig.mock.invocationCallOrder[0]!).toBeLessThan(
            mockRegisterServerErrorSentryLogging.mock.invocationCallOrder[0]!,
        );
        expect(mockRegisterServerErrorSentryLogging.mock.invocationCallOrder[0]!).toBeLessThan(
            mockRegisterNodeRuntimeInstrumentation.mock.invocationCallOrder[0]!,
        );
    });

    it('skips node-only instrumentation outside the node runtime', async () => {
        Reflect.set(process.env, 'NEXT_RUNTIME', 'edge');

        await register();

        expect(mockRegisterSentryEdgeConfig).toHaveBeenCalledTimes(1);
        expect(mockRegisterSentryServerConfig).not.toHaveBeenCalled();
        expect(mockRegisterServerErrorSentryLogging).not.toHaveBeenCalled();
        expect(mockRegisterNodeRuntimeInstrumentation).not.toHaveBeenCalled();
    });

    it('exports the Sentry request error hook for Next.js request instrumentation', () => {
        expect(onRequestError).toBeDefined();
    });
});

/**
 * Restores one environment variable after test mutation.
 *
 * @param envName - Environment variable name.
 * @param value - Original value before the test changed it.
 */
function restoreEnvironmentVariable(envName: 'NEXT_RUNTIME', value: string | undefined): void {
    if (value === undefined) {
        delete process.env[envName];
        return;
    }

    Reflect.set(process.env, envName, value);
}
