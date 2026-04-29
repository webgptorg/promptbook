import { AGENT_INTERNAL_ACCESS_HEADER, isAgentInternalAccessTokenValid } from '../../../../src/commitments/_common/agentInternalAccess';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { getCurrentUser } from './getCurrentUser';
import { resolveAgentVisibilityAccess } from './agentAccess';
import type { AgentVisibility } from './agentVisibility';

jest.mock('../../../../src/commitments/_common/agentInternalAccess', () => ({
    AGENT_INTERNAL_ACCESS_HEADER: 'x-promptbook-agent-internal-access',
    isAgentInternalAccessTokenValid: jest.fn(),
}));

jest.mock('../database/$getTableName', () => ({
    $getTableName: jest.fn(),
}));

jest.mock('../database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(),
}));

jest.mock('./getCurrentUser', () => ({
    getCurrentUser: jest.fn(),
}));

const mockGetTableName = jest.mocked($getTableName);
const mockProvideSupabaseForServer = jest.mocked($provideSupabaseForServer);
const mockGetCurrentUser = jest.mocked(getCurrentUser);
const mockIsAgentInternalAccessTokenValid = jest.mocked(isAgentInternalAccessTokenValid);

/**
 * Creates the subset of the Supabase query chain used by agent visibility checks.
 *
 * @param visibility - Agent visibility returned from the mocked database.
 */
function mockAgentVisibility(visibility: AgentVisibility | null) {
    const limit = jest.fn().mockResolvedValue({
        data: visibility ? [{ visibility, deletedAt: null }] : [],
        error: null,
    });
    const is = jest.fn(() => ({ limit }));
    const or = jest.fn(() => ({ is }));
    const select = jest.fn(() => ({ or }));
    const from = jest.fn(() => ({ select }));

    mockProvideSupabaseForServer.mockReturnValue({ from } as never);

    return { from, select, or, is, limit };
}

describe('resolveAgentVisibilityAccess', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTableName.mockResolvedValue('Agent');
        mockGetCurrentUser.mockResolvedValue(null);
        mockIsAgentInternalAccessTokenValid.mockReturnValue(false);
    });

    it('denies anonymous access to private agents', async () => {
        mockAgentVisibility('PRIVATE');

        await expect(resolveAgentVisibilityAccess({ agentIdentifier: 'private-agent' })).resolves.toMatchObject({
            isAllowed: false,
            visibility: 'PRIVATE',
            currentUser: null,
            isInternalAgentAccess: false,
        });
    });

    it('allows anonymous access to unlisted and public agents', async () => {
        mockAgentVisibility('UNLISTED');

        await expect(resolveAgentVisibilityAccess({ agentIdentifier: 'unlisted-agent' })).resolves.toMatchObject({
            isAllowed: true,
            visibility: 'UNLISTED',
        });

        mockAgentVisibility('PUBLIC');

        await expect(resolveAgentVisibilityAccess({ agentIdentifier: 'public-agent' })).resolves.toMatchObject({
            isAllowed: true,
            visibility: 'PUBLIC',
        });
    });

    it('allows signed-in users to access private agents', async () => {
        mockAgentVisibility('PRIVATE');
        mockGetCurrentUser.mockResolvedValue({
            username: 'alice',
            isAdmin: false,
            profileImageUrl: null,
        });

        await expect(resolveAgentVisibilityAccess({ agentIdentifier: 'private-agent' })).resolves.toMatchObject({
            isAllowed: true,
            visibility: 'PRIVATE',
            currentUser: {
                username: 'alice',
            },
        });
    });

    it('allows internal TEAM requests to access private agents only when enabled for the route', async () => {
        mockAgentVisibility('PRIVATE');
        mockIsAgentInternalAccessTokenValid.mockReturnValue(true);
        const request = new Request('https://example.test/agents/private-agent/api/profile', {
            headers: {
                [AGENT_INTERNAL_ACCESS_HEADER]: 'trusted-token',
            },
        });

        await expect(resolveAgentVisibilityAccess({ agentIdentifier: 'private-agent', request })).resolves.toMatchObject({
            isAllowed: false,
            isInternalAgentAccess: false,
        });

        await expect(
            resolveAgentVisibilityAccess({
                agentIdentifier: 'private-agent',
                request,
                isInternalAgentAccessAllowed: true,
            }),
        ).resolves.toMatchObject({
            isAllowed: true,
            visibility: 'PRIVATE',
            isInternalAgentAccess: true,
        });
    });
});
