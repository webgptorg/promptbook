import { describe, expect, it } from '@jest/globals';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { filterMazeRenderableAgents, isMazeRenderableAgent } from './mazeOfficeAgentSupport';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Creates a minimal local homepage agent fixture.
 */
function createLocalAgent(agentName: string, metaOverrides: Partial<AgentOrganizationAgent['meta']> = {}): AgentOrganizationAgent {
    return {
        agentName,
        agentHash: `${agentName}-hash`,
        permanentId: `${agentName}-id`,
        personaDescription: `${agentName} summary`,
        initialMessage: null,
        meta: {
            fullname: agentName,
            description: `${agentName} description`,
            color: '#0f766e',
            ...metaOverrides,
        },
        links: [],
        parameters: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
        folderId: null,
        sortOrder: 0,
    };
}

/**
 * Creates a minimal federated agent fixture.
 */
function createFederatedAgent(agentName: string): AgentWithVisibility & { isMetaImageExplicit?: boolean; avatarVisualId?: 'octopus2' } {
    return {
        ...createLocalAgent(agentName),
        visibility: 'PUBLIC',
        serverUrl: 'https://remote.example',
    };
}

describe('mazeOfficeAgentSupport', () => {
    it('omits agents with an explicit META IMAGE from the maze', () => {
        const imageAgent = createLocalAgent('Painter', {
            image: 'https://example.com/avatar.png',
        });

        expect(isMazeRenderableAgent(imageAgent, 'https://local.test/')).toBe(false);
        expect(filterMazeRenderableAgents([imageAgent], 'https://local.test/')).toHaveLength(0);
    });

    it('keeps remote agents that advertise a built-in avatar visual instead of an explicit image', () => {
        const remoteAgent = {
            ...createFederatedAgent('Remote Helper'),
            meta: {
                ...createFederatedAgent('Remote Helper').meta,
                image: 'https://remote.example/agents/remote-helper/images/default-avatar.png',
            },
            isMetaImageExplicit: false,
            avatarVisualId: 'octopus2' as const,
        };

        expect(isMazeRenderableAgent(remoteAgent, 'https://local.test/')).toBe(true);
        expect(filterMazeRenderableAgents([remoteAgent], 'https://local.test/')).toHaveLength(1);
    });
});
