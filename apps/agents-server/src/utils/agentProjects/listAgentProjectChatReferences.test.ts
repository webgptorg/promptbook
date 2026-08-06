import { describe, expect, it, jest } from '@jest/globals';
import { listAgentProjectRuntimes } from './agentProjectRuntimeRegistry';
import { listAgentProjects } from './listAgentProjects';
import { listAgentProjectChatReferences } from './listAgentProjectChatReferences';
import { resolveAgentProjectPublicUrls } from './resolveAgentProjectPublicUrls';

jest.mock('./agentProjectRuntimeRegistry', () => ({
    listAgentProjectRuntimes: jest.fn(),
}));

jest.mock('./listAgentProjects', () => ({
    listAgentProjects: jest.fn(),
}));

jest.mock('./resolveAgentProjectPublicUrls', () => ({
    resolveAgentProjectPublicUrls: jest.fn(),
}));

const listMockedAgentProjectRuntimes = jest.mocked(listAgentProjectRuntimes);
const listMockedAgentProjects = jest.mocked(listAgentProjects);
const resolveMockedAgentProjectPublicUrls = jest.mocked(resolveAgentProjectPublicUrls);

describe('listAgentProjectChatReferences', () => {
    it('enriches only the owning agent projects with their matching runtime state', async () => {
        resolveMockedAgentProjectPublicUrls.mockResolvedValue(new Map());
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

    it('keeps the public project URL of stopped projects', async () => {
        listMockedAgentProjects.mockResolvedValue([
            {
                projectName: 'prague-murders-map',
                displayName: 'prague-murders-map',
                description: '',
                sizeBytes: 4600,
            },
        ] as unknown as Awaited<ReturnType<typeof listAgentProjects>>);
        listMockedAgentProjectRuntimes.mockResolvedValue([]);
        resolveMockedAgentProjectPublicUrls.mockResolvedValue(
            new Map([['prague-murders-map', 'https://prague-murders-map.live.ptbk.io']]),
        );

        await expect(listAgentProjectChatReferences('agent')).resolves.toEqual([
            {
                projectName: 'prague-murders-map',
                displayName: 'prague-murders-map',
                description: '',
                sizeBytes: 4600,
                isRunning: false,
                projectUrl: 'https://prague-murders-map.live.ptbk.io',
            },
        ]);
    });
});
