import { describe, expect, it, jest } from '@jest/globals';
import { listAgentProjectRuntimes } from './agentProjectRuntimeRegistry';
import { listAgentProjects } from './listAgentProjects';
import { listAgentProjectChatReferences } from './listAgentProjectChatReferences';

jest.mock('./agentProjectRuntimeRegistry', () => ({
    listAgentProjectRuntimes: jest.fn(),
}));

jest.mock('./listAgentProjects', () => ({
    listAgentProjects: jest.fn(),
}));

const listMockedAgentProjectRuntimes = jest.mocked(listAgentProjectRuntimes);
const listMockedAgentProjects = jest.mocked(listAgentProjects);

describe('listAgentProjectChatReferences', () => {
    it('enriches only the owning agent projects with their matching runtime state', async () => {
        listMockedAgentProjects.mockResolvedValue([
            {
                projectName: 'Website',
                displayName: 'Website',
                description: 'A public website',
                sizeBytes: 120,
            },
            {
                projectName: 'dashboard',
                displayName: 'Dashboard',
                description: 'An internal dashboard',
                sizeBytes: 240,
            },
        ] as unknown as Awaited<ReturnType<typeof listAgentProjects>>);
        listMockedAgentProjectRuntimes.mockResolvedValue([
            {
                agentPermanentId: 'AGENT',
                projectName: 'website',
                isRunning: true,
                publicUrl: 'https://website.example.com',
            },
            {
                agentPermanentId: 'another-agent',
                projectName: 'dashboard',
                isRunning: true,
                publicUrl: 'https://other-dashboard.example.com',
            },
        ] as unknown as Awaited<ReturnType<typeof listAgentProjectRuntimes>>);

        await expect(listAgentProjectChatReferences('agent')).resolves.toEqual([
            {
                projectName: 'Website',
                displayName: 'Website',
                description: 'A public website',
                sizeBytes: 120,
                isRunning: true,
                projectUrl: 'https://website.example.com',
            },
            {
                projectName: 'dashboard',
                displayName: 'Dashboard',
                description: 'An internal dashboard',
                sizeBytes: 240,
                isRunning: false,
                projectUrl: null,
            },
        ]);
    });
});
