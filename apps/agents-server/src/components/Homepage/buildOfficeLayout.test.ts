import { describe, expect, it } from '@jest/globals';
import type { AgentCapability } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
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
 * Minimal folder fixture used by office layout tests.
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

describe('buildOfficeLayout', () => {
    it('creates local, meeting, and head-office remote groups with stable routes', () => {
        const layout = buildOfficeLayout({
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
                createLocalAgent('Dora', {
                    folderId: null,
                    sortOrder: 3,
                }),
            ],
            federatedAgents: [createFederatedAgent('Adam', 'https://ptbk.io/')],
            folders: FOLDERS,
            publicUrl: 'https://local.test/' as const,
        });

        expect(layout.rooms.some((room) => room.label === 'Research')).toBe(true);
        expect(layout.rooms.some((room) => room.label === 'Head Office' && room.kind === 'head-office')).toBe(true);
        expect(layout.stateCounts.meeting).toBeGreaterThan(0);
        expect(layout.stateCounts.working).toBeGreaterThan(0);
        expect(layout.stateCounts.moving).toBeGreaterThan(0);

        const localAlice = layout.agents.find((agent) => agent.agent.agentName === 'Alice');
        const remoteAdam = layout.agents.find((agent) => agent.agent.agentName === 'Adam');

        expect(localAlice?.defaultHref).toBe('/agents/Alice-id/chat?chat=new');
        expect(localAlice?.profileHref).toBe('/agents/Alice-id');
        expect(localAlice?.chatHref).toBe('/agents/Alice-id/chat?chat=new');
        expect(remoteAdam?.defaultHref).toBe('https://ptbk.io/agents/Adam-id/chat?chat=new');
        expect(remoteAdam?.profileHref).toBe('https://ptbk.io/agents/Adam-id');
        expect(remoteAdam?.bookHref).toBe('https://ptbk.io/agents/Adam-id/book');
    });
});
