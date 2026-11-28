import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { isAgentsServerSqliteMode } from '../../../../../database/agentsServerDatabaseMode';
import { isUserGlobalAdmin } from '../../../../../utils/isUserGlobalAdmin';
import {
    assertGlobalAdminAccess,
    parseManagedServerId,
    updateManagedServer,
} from '../../../../../utils/serverManagement';
import { applyServerMetadata } from '../../../../../utils/serverManagement/standaloneVpsServerMetadata';
import { PATCH } from './route';

jest.mock('../../../../../database/agentsServerDatabaseMode', () => ({
    isAgentsServerSqliteMode: jest.fn(),
}));

jest.mock('../../../../../utils/isUserGlobalAdmin', () => ({
    isUserGlobalAdmin: jest.fn(),
}));

jest.mock('../../../../../utils/serverManagement', () => ({
    assertGlobalAdminAccess: jest.fn(),
    deleteManagedServer: jest.fn(),
    parseManagedServerId: jest.fn(),
    resolveManagedServerErrorStatus: jest.fn(),
    updateManagedServer: jest.fn(),
}));

jest.mock('../../../../../utils/serverManagement/standaloneVpsServerMetadata', () => ({
    applyServerMetadata: jest.fn(),
}));

/**
 * Mocked database-mode resolver used by the server update route tests.
 */
const isAgentsServerSqliteModeMock = isAgentsServerSqliteMode as jest.MockedFunction<typeof isAgentsServerSqliteMode>;

/**
 * Mocked global-admin permission lookup used by the server update route tests.
 */
const isUserGlobalAdminMock = isUserGlobalAdmin as jest.MockedFunction<typeof isUserGlobalAdmin>;

/**
 * Mocked global-admin assertion used by the server update route tests.
 */
const assertGlobalAdminAccessMock = assertGlobalAdminAccess as jest.MockedFunction<typeof assertGlobalAdminAccess>;

/**
 * Mocked server id parser used by the server update route tests.
 */
const parseManagedServerIdMock = parseManagedServerId as jest.MockedFunction<typeof parseManagedServerId>;

/**
 * Mocked registry update used by the server update route tests.
 */
const updateManagedServerMock = updateManagedServer as jest.MockedFunction<typeof updateManagedServer>;

/**
 * Mocked explicitly scoped metadata writer used by the server update route tests.
 */
const applyServerMetadataMock = applyServerMetadata as jest.MockedFunction<typeof applyServerMetadata>;

describe('PATCH /api/admin/servers/[serverId]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        isAgentsServerSqliteModeMock.mockReturnValue(false);
        isUserGlobalAdminMock.mockResolvedValue(true);
        parseManagedServerIdMock.mockReturnValue(47);
        updateManagedServerMock.mockResolvedValue({
            id: 47,
            name: 'Renamed server',
            environment: 'PRODUCTION',
            domain: 'renamed.example.com',
            tablePrefix: 'server_Renamed_',
            createdAt: '2026-07-30T08:00:00.000Z',
            updatedAt: '2026-07-30T08:15:00.000Z',
        });
        applyServerMetadataMock.mockResolvedValue();
    });

    it('mirrors a renamed managed server into its own SERVER_NAME metadata', async () => {
        const response = await PATCH(
            new Request('https://current.example.com/api/admin/servers/47', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Renamed server',
                    environment: 'PRODUCTION',
                    domain: 'renamed.example.com',
                    tablePrefix: 'server_Renamed_',
                }),
            }),
            { params: Promise.resolve({ serverId: '47' }) },
        );

        expect(response.status).toBe(200);
        expect(assertGlobalAdminAccessMock).toHaveBeenCalledWith(true);
        expect(updateManagedServerMock).toHaveBeenCalledWith({
            id: 47,
            name: 'Renamed server',
            environment: 'PRODUCTION',
            domain: 'renamed.example.com',
            tablePrefix: 'server_Renamed_',
        });
        expect(applyServerMetadataMock).toHaveBeenCalledWith({
            server: {
                id: 47,
                name: 'Renamed server',
                environment: 'PRODUCTION',
                domain: 'renamed.example.com',
                tablePrefix: 'server_Renamed_',
                createdAt: '2026-07-30T08:00:00.000Z',
                updatedAt: '2026-07-30T08:15:00.000Z',
            },
            name: 'Renamed server',
        });
    });
});
