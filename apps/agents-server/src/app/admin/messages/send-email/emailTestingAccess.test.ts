import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { $provideServer } from '../../../../tools/$provideServer';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../../utils/isUserGlobalAdmin';
import { getEmailTestingAccessContext } from './emailTestingAccess';

jest.mock('../../../../tools/$provideServer', () => ({
    $provideServer: jest.fn(),
}));

jest.mock('../../../../utils/isUserAdmin', () => ({
    isUserAdmin: jest.fn(),
}));

jest.mock('../../../../utils/isUserGlobalAdmin', () => ({
    isUserGlobalAdmin: jest.fn(),
}));

/**
 * Mocked current-server resolver used by email testing access tests.
 */
const provideServerMock = $provideServer as jest.MockedFunction<typeof $provideServer>;

/**
 * Mocked current-server-admin authorization resolver used by email testing access tests.
 */
const isUserAdminMock = isUserAdmin as jest.MockedFunction<typeof isUserAdmin>;

/**
 * Mocked VPS-superadmin authorization resolver used by email testing access tests.
 */
const isUserGlobalAdminMock = isUserGlobalAdmin as jest.MockedFunction<typeof isUserGlobalAdmin>;

describe('getEmailTestingAccessContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        isUserAdminMock.mockResolvedValue(true);
        isUserGlobalAdminMock.mockResolvedValue(false);
        provideServerMock.mockResolvedValue({
            id: 1,
            publicUrl: new URL('https://CURRENT.EXAMPLE.COM'),
            tablePrefix: 'server_Current_',
        });
    });

    it('returns the current server scope for a normal administrator', async () => {
        await expect(getEmailTestingAccessContext()).resolves.toEqual({
            currentServerDomain: 'current.example.com',
            isGlobalAdmin: false,
        });
    });

    it('allows the VPS superadmin even without a current-server admin session', async () => {
        isUserAdminMock.mockResolvedValue(false);
        isUserGlobalAdminMock.mockResolvedValue(true);

        await expect(getEmailTestingAccessContext()).resolves.toEqual({
            currentServerDomain: 'current.example.com',
            isGlobalAdmin: true,
        });
    });

    it('does not resolve server state for an unauthorized user', async () => {
        isUserAdminMock.mockResolvedValue(false);
        isUserGlobalAdminMock.mockResolvedValue(false);

        await expect(getEmailTestingAccessContext()).resolves.toBeNull();
        expect(provideServerMock).not.toHaveBeenCalled();
    });
});
