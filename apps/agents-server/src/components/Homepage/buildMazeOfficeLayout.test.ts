import { describe, expect, it } from '@jest/globals';
import type { AgentCapability } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { buildMazeOfficeLayout } from './buildMazeOfficeLayout';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Creates a minimal local homepage agent fixture.
 */
function createLocalAgent(
    agentName: string,
    options: {
        folderId: number | null;
        sortOrder: number;
        capabilities?: Array<AgentCapability>;
        metaImage?: string;
    },
): AgentOrganizationAgent {
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
            image: options.metaImage,
        },
        links: [],
        parameters: [],
        capabilities: options.capabilities || [],
        samples: [],
        knowledgeSources: [],
        folderId: options.folderId,
        sortOrder: options.sortOrder,
    };
}

/**
 * Creates a minimal federated agent fixture.
 */
function createFederatedAgent(
    agentName: string,
    serverUrl: string,
    capabilities: Array<AgentCapability> = [],
): AgentWithVisibility {
    return {
        agentName,
        agentHash: `${agentName}-hash`,
        permanentId: `${agentName}-id`,
        personaDescription: `${agentName} summary`,
        initialMessage: null,
        meta: {
            fullname: agentName,
            description: `${agentName} description`,
            color: '#2563eb',
        },
        links: [],
        parameters: [],
        capabilities,
        samples: [],
        knowledgeSources: [],
        folderId: null,
        sortOrder: 0,
        visibility: 'PUBLIC',
        serverUrl,
    };
}

/**
 * Minimal folder fixture used by maze layout tests.
 */
const FOLDERS: Array<AgentOrganizationFolder> = [
    {
        id: 1,
        name: 'Research',
        parentId: null,
        sortOrder: 0,
        icon: null,
        color: '#0f766e',
    },
];

describe('buildMazeOfficeLayout', () => {
    it('builds a corridor-heavy layout and excludes explicit image agents', () => {
        const layout = buildMazeOfficeLayout({
            agents: [
                createLocalAgent('Alice', {
                    folderId: 1,
                    sortOrder: 0,
                    capabilities: [{ type: 'browser', label: 'Browser', iconName: 'Globe' }],
                }),
                createLocalAgent('Bob', {
                    folderId: 1,
                    sortOrder: 1,
                    capabilities: [{ type: 'team', label: 'Team', iconName: 'Users' }],
                }),
                createLocalAgent('Cara', {
                    folderId: 1,
                    sortOrder: 2,
                    capabilities: [{ type: 'team', label: 'Team', iconName: 'Users' }],
                }),
                createLocalAgent('Portrait', {
                    folderId: 1,
                    sortOrder: 3,
                    metaImage: 'https://example.com/portrait.png',
                }),
            ],
            federatedAgents: [createFederatedAgent('Adam', 'https://ptbk.io/')],
            folders: FOLDERS,
            publicUrl: 'https://local.test/' as const,
        });

        expect(layout.rooms.some((room) => room.label === 'Research')).toBe(true);
        expect(layout.corridors.some((corridor) => corridor.kind === 'spine')).toBe(true);
        expect(layout.corridors.some((corridor) => corridor.kind === 'connector')).toBe(true);
        expect(layout.agents.some((agent) => agent.agent.agentName === 'Portrait')).toBe(false);
        expect(layout.agents.some((agent) => agent.state === 'moving' && agent.path !== null)).toBe(true);
        expect(layout.links.length).toBeGreaterThan(0);
    });
});
