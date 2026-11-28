import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { TOOL_RUNTIME_CONTEXT_PARAMETER } from '../../../../../../../../src/commitments/_common/toolRuntimeContext';

jest.mock('@/src/utils/currentUserIdentity', () => ({
    resolveCurrentUserIdentity: jest.fn(),
}));

jest.mock('@/src/utils/userMemory', () => ({
    resolveCurrentUserMemoryIdentity: jest.fn(),
}));

import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { resolveAgentChatRequestIdentities } from './resolveAgentChatRequestIdentities';

/**
 * Mocked browser/session identity resolver.
 */
const mockResolveCurrentUserIdentity = jest.mocked(resolveCurrentUserIdentity);

/**
 * Mocked memory identity resolver.
 */
const mockResolveCurrentUserMemoryIdentity = jest.mocked(resolveCurrentUserMemoryIdentity);

describe('resolveAgentChatRequestIdentities', () => {
    beforeEach(() => {
        mockResolveCurrentUserIdentity.mockReset();
        mockResolveCurrentUserMemoryIdentity.mockReset();
    });

    it('does not create browser request identities for internal TEAM calls', async () => {
        const identities = await resolveAgentChatRequestIdentities({
            [TOOL_RUNTIME_CONTEXT_PARAMETER]: JSON.stringify({
                memory: {
                    isTeamConversation: true,
                    enabled: false,
                    username: 'admin',
                    userId: 42,
                },
            }),
        });

        expect(identities).toEqual({
            currentUserIdentity: null,
            currentRequestIdentity: null,
            isTeamConversation: true,
        });
        expect(mockResolveCurrentUserIdentity).not.toHaveBeenCalled();
        expect(mockResolveCurrentUserMemoryIdentity).not.toHaveBeenCalled();
    });

    it('resolves normal browser request identities for direct chat calls', async () => {
        const currentRequestIdentity = {
            userId: 7,
            username: 'direct-user',
            isAdmin: false,
            isAnonymous: false,
            sessionUser: null,
        };
        const currentUserIdentity = {
            userId: 7,
            user: {
                username: 'direct-user',
                isAdmin: false,
                profileImageUrl: null,
            },
        };
        mockResolveCurrentUserIdentity.mockResolvedValue(currentRequestIdentity);
        mockResolveCurrentUserMemoryIdentity.mockResolvedValue(currentUserIdentity);

        const identities = await resolveAgentChatRequestIdentities({});

        expect(identities).toEqual({
            currentUserIdentity,
            currentRequestIdentity,
            isTeamConversation: false,
        });
        expect(mockResolveCurrentUserIdentity).toHaveBeenCalledTimes(1);
        expect(mockResolveCurrentUserMemoryIdentity).toHaveBeenCalledTimes(1);
    });
});
