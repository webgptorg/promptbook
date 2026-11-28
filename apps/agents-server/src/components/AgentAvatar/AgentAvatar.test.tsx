/** @jest-environment jsdom */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { AgentAvatar } from './AgentAvatar';
import { resolveAgentAvatar } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { useDefaultAgentAvatarVisualId } from './DefaultAgentAvatarVisualProvider';

const mockAvatarOrImage = jest.fn();

jest.mock('../../../../../src/utils/agents/resolveAgentAvatarImageUrl', () => ({
    resolveAgentAvatar: jest.fn(),
}));

jest.mock('../../../../../src/avatars/AvatarOrImage', () => ({
    AvatarOrImage: (props: Record<string, unknown>) => {
        mockAvatarOrImage(props);
        return <div data-testid="avatar-or-image" />;
    },
}));

jest.mock('./DefaultAgentAvatarVisualProvider', () => ({
    useDefaultAgentAvatarVisualId: jest.fn(),
}));

/**
 * Captures the avatar props returned by the shared renderer.
 */
const resolveAgentAvatarMock = resolveAgentAvatar as jest.MockedFunction<typeof resolveAgentAvatar>;

/**
 * Mocked default-avatar visual provider used by the component tests.
 */
const useDefaultAgentAvatarVisualIdMock = useDefaultAgentAvatarVisualId as jest.MockedFunction<
    typeof useDefaultAgentAvatarVisualId
>;

describe('AgentAvatar', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('prefers the federated server default avatar visual over the local server default', () => {
        useDefaultAgentAvatarVisualIdMock.mockReturnValue('octopus3');
        resolveAgentAvatarMock.mockReturnValue({
            type: 'visual',
            visualId: 'ascii-octopus',
            avatarDefinition: {
                agentName: 'Remote Assistant',
                agentHash: 'remote-assistant-hash',
                colors: ['#4477ff'],
            },
        });

        render(
            <AgentAvatar
                agent={
                    {
                        agentName: 'Remote Assistant',
                        agentHash: 'remote-assistant-hash',
                        permanentId: 'remote-assistant',
                        meta: {
                            fullname: 'Remote Assistant',
                            color: '#4477ff',
                        },
                        defaultAgentAvatarVisualId: 'ascii-octopus',
                    } as never
                }
                size={48}
            />,
        );

        expect(resolveAgentAvatarMock).toHaveBeenCalledWith(
            expect.objectContaining({
                agent: expect.objectContaining({
                    avatarVisualId: 'ascii-octopus',
                    defaultAgentAvatarVisualId: 'ascii-octopus',
                }),
            }),
        );
    });

    it('keeps an explicit agent avatar visual ahead of the federated server default', () => {
        useDefaultAgentAvatarVisualIdMock.mockReturnValue('octopus3');
        resolveAgentAvatarMock.mockReturnValue({
            type: 'visual',
            visualId: 'octopus2',
            avatarDefinition: {
                agentName: 'Remote Assistant',
                agentHash: 'remote-assistant-hash',
                colors: ['#4477ff'],
            },
        });

        render(
            <AgentAvatar
                agent={
                    {
                        agentName: 'Remote Assistant',
                        agentHash: 'remote-assistant-hash',
                        permanentId: 'remote-assistant',
                        meta: {
                            fullname: 'Remote Assistant',
                            color: '#4477ff',
                        },
                        avatarVisualId: 'octopus2',
                        defaultAgentAvatarVisualId: 'ascii-octopus',
                    } as never
                }
                size={48}
            />,
        );

        expect(resolveAgentAvatarMock).toHaveBeenCalledWith(
            expect.objectContaining({
                agent: expect.objectContaining({
                    avatarVisualId: 'octopus2',
                    defaultAgentAvatarVisualId: 'ascii-octopus',
                }),
            }),
        );
    });
});
