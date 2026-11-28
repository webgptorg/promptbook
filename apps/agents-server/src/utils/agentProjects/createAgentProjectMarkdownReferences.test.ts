import { describe, expect, it, jest } from '@jest/globals';
import { createAgentProjectMarkdownReferences } from './createAgentProjectMarkdownReferences';

describe('createAgentProjectMarkdownReferences', () => {
    it('creates project profile chip references from project names', () => {
        expect(
            createAgentProjectMarkdownReferences({
                agentPermanentId: 'agent one',
                projects: [
                    {
                        projectName: 'website',
                        displayName: 'Website',
                        description: 'Marketing website',
                        faviconRelativePath: null,
                    },
                ],
            }),
        ).toEqual([
            {
                reference: 'website',
                sourceTextAliases: ['Website'],
                label: 'Website',
                href: '/agents/agent%20one/projects/website',
                sourceHrefPrefixes: ['/agents/agent%20one/projects/website'],
                title: 'Marketing website',
                icon: {
                    src: null,
                    fallbackText: 'W',
                },
                menu: {
                    status: {
                        label: 'Project is not running',
                        isActive: false,
                    },
                    options: [
                        {
                            label: 'Open the project in a new tab',
                            href: null,
                            title: 'The project must run before it can be opened.',
                        },
                        {
                            label: 'Open the project page in a new tab',
                            href: '/agents/agent%20one/projects/website',
                            title: 'Open the project page in a new tab',
                        },
                    ],
                },
            },
        ]);
    });

    it('labels the chip with the resolved project display name', () => {
        expect(
            createAgentProjectMarkdownReferences({
                agentPermanentId: 'agent',
                projects: [
                    {
                        projectName: 'prague-murders-map',
                        displayName: 'Prague Murders Map',
                        description: '',
                        faviconRelativePath: null,
                    },
                ],
            }),
        ).toEqual([
            {
                reference: 'prague-murders-map',
                sourceTextAliases: ['Prague Murders Map'],
                label: 'Prague Murders Map',
                href: '/agents/agent/projects/prague-murders-map',
                sourceHrefPrefixes: ['/agents/agent/projects/prague-murders-map'],
                title: 'Prague Murders Map',
                icon: {
                    src: null,
                    fallbackText: 'PMM',
                },
                menu: {
                    status: {
                        label: 'Project is not running',
                        isActive: false,
                    },
                    options: [
                        {
                            label: 'Open the project in a new tab',
                            href: null,
                            title: 'The project must run before it can be opened.',
                        },
                        {
                            label: 'Open the project page in a new tab',
                            href: '/agents/agent/projects/prague-murders-map',
                            title: 'Open the project page in a new tab',
                        },
                    ],
                },
            },
        ]);
    });

    it('includes the running project URL in the new-tab project action', () => {
        const [reference] = createAgentProjectMarkdownReferences({
            agentPermanentId: 'agent',
            projects: [
                {
                    projectName: 'website',
                    displayName: 'Website',
                    description: '',
                    faviconRelativePath: null,
                    isRunning: true,
                    projectUrl: 'https://website.example.com',
                },
            ],
        });

        expect(reference?.reference).toBe('website');
        expect(reference?.sourceTextAliases).toEqual(['Website']);
        expect(reference?.menu?.status).toEqual({
            label: 'Project is running',
            isActive: true,
        });
        expect(reference?.menu?.options[0]).toMatchObject({
            label: 'Open the project in a new tab',
            href: 'https://website.example.com',
        });
    });

    it('recognizes the project page, its files and its public URL as the same project', () => {
        const [reference] = createAgentProjectMarkdownReferences({
            agentPermanentId: 'agent',
            projects: [
                {
                    projectName: 'website',
                    displayName: 'Website',
                    description: '',
                    faviconRelativePath: null,
                    isRunning: false,
                    projectUrl: 'https://website.example.com',
                },
            ],
        });

        expect(reference?.sourceHrefPrefixes).toEqual([
            '/agents/agent/projects/website',
            'https://website.example.com',
        ]);
        expect(reference?.menu?.options[0]).toMatchObject({
            label: 'Open the project in a new tab',
            href: null,
            title: 'The project must run before it can be opened.',
        });
    });

    it('adds the favicon and interactive open and runtime actions', async () => {
        const onOpenProject = jest.fn(async () => undefined);
        const onChangeProjectRuntime = jest.fn(async () => undefined);
        const [reference] = createAgentProjectMarkdownReferences({
            agentPermanentId: 'agent',
            projects: [
                {
                    projectName: 'website-studio',
                    displayName: 'Website Studio',
                    description: '',
                    faviconRelativePath: 'assets/favicon.svg',
                    isRunning: false,
                    projectUrl: 'https://website.example.com',
                },
            ],
            onOpenProject,
            onChangeProjectRuntime,
        });

        expect(reference?.icon).toEqual({
            src: '/agents/agent/projects/website-studio/files/assets/favicon.svg',
            fallbackText: 'WS',
        });
        expect(reference?.menu?.options).toHaveLength(3);
        expect(reference?.menu?.options[0]).toMatchObject({
            label: 'Open the project in a new tab',
            href: null,
            action: { id: 'open-agent-project' },
        });
        expect(reference?.menu?.options[2]).toMatchObject({
            label: 'Start the project',
            href: null,
            action: { id: 'start-agent-project' },
        });

        await reference?.menu?.options[0]?.action?.onSelect();
        await reference?.menu?.options[2]?.action?.onSelect();

        expect(onOpenProject).toHaveBeenCalledWith(expect.objectContaining({ projectName: 'website-studio' }));
        expect(onChangeProjectRuntime).toHaveBeenCalledWith(
            expect.objectContaining({ projectName: 'website-studio' }),
            true,
        );
    });
});
