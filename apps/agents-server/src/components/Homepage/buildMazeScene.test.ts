import { describe, expect, it } from '@jest/globals';
import type { AgentCapability } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { buildMazeScene } from './buildMazeScene';
import { buildOfficeLayout } from './buildOfficeLayout';
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
        fullname?: string;
    },
): AgentOrganizationAgent {
    return {
        agentName,
        agentHash: `${agentName}-hash`,
        permanentId: `${agentName}-id`,
        personaDescription: `${agentName} summary`,
        initialMessage: null,
        meta: {
            fullname: options.fullname || agentName,
            description: `${agentName} description`,
            color: '#0f766e',
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

describe('buildMazeScene', () => {
    it('derives a maze corridor network and avatar motion from the shared office layout', () => {
        const officeLayout = buildOfficeLayout({
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
                    folderId: null,
                    sortOrder: 2,
                }),
                createLocalAgent('Dora', {
                    folderId: null,
                    sortOrder: 3,
                }),
            ],
            federatedAgents: [createFederatedAgent('Adam', 'https://ptbk.io/')],
            folders: FOLDERS,
            publicUrl: 'https://local.test/' as const,
        });

        const mazeScene = buildMazeScene(officeLayout);
        const movingAgent = mazeScene.agents.find((agent) => agent.officeAgent.state === 'moving');

        expect(mazeScene.rooms.length).toBe(officeLayout.rooms.length);
        expect(mazeScene.corridors.some((corridor) => corridor.tone === 'spine')).toBe(true);
        expect(mazeScene.corridors.some((corridor) => corridor.tone === 'alcove')).toBe(true);
        expect(mazeScene.agents.every((agent) => agent.tentacles.length >= 6)).toBe(true);
        expect(movingAgent?.motionPath?.length).toBeGreaterThanOrEqual(5);
    });
});
