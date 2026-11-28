import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { resolveCurrentOrInternalServerOrigin } from './resolveCurrentOrInternalServerOrigin';
import { $provideServer } from '../tools/$provideServer';
import { resolveInternalServerOrigin } from './resolveInternalServerOrigin';

jest.mock('../tools/$provideServer', () => ({
    $provideServer: jest.fn(),
}));

jest.mock('./resolveInternalServerOrigin', () => ({
    resolveInternalServerOrigin: jest.fn(),
}));

/**
 * Mocked request-scoped server provider used by the origin resolver tests.
 */
const provideServerMock = $provideServer as jest.MockedFunction<typeof $provideServer>;

/**
 * Mocked deployment-level internal-origin resolver used by the fallback tests.
 */
const resolveInternalServerOriginMock = resolveInternalServerOrigin as jest.MockedFunction<
    typeof resolveInternalServerOrigin
>;

describe('resolveCurrentOrInternalServerOrigin', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('prefers the current request-scoped server origin when available', async () => {
        provideServerMock.mockResolvedValue({
            id: 7,
            publicUrl: new URL('https://core-test.ptbk.io/'),
            tablePrefix: 'server_CoreTest_',
        });

        await expect(resolveCurrentOrInternalServerOrigin()).resolves.toBe('https://core-test.ptbk.io');
        expect(resolveInternalServerOriginMock).not.toHaveBeenCalled();
    });

    it('falls back to the deployment-level internal origin when no request scope is active', async () => {
        provideServerMock.mockRejectedValue(new Error('`headers` was called outside a request scope.'));
        resolveInternalServerOriginMock.mockReturnValue('https://agents.example.com');

        await expect(resolveCurrentOrInternalServerOrigin()).resolves.toBe('https://agents.example.com');
        expect(resolveInternalServerOriginMock).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-request-scope failures from request-scoped server resolution', async () => {
        provideServerMock.mockRejectedValue(new Error('Server with host "unknown.example.com" is not registered in _Server'));

        await expect(resolveCurrentOrInternalServerOrigin()).rejects.toThrow(
            'Server with host "unknown.example.com" is not registered in _Server',
        );
        expect(resolveInternalServerOriginMock).not.toHaveBeenCalled();
    });
});
