import { describe, expect, it } from '@jest/globals';
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
                    },
                ],
            }),
        ).toEqual([
            {
                reference: 'website',
                label: 'Website',
                href: '/agents/agent%20one/projects/website',
                sourceHrefPrefixes: ['/agents/agent%20one/projects/website'],
                title: 'Marketing website',
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
                    },
                ],
            }),
        ).toEqual([
            {
                reference: 'prague-murders-map',
                label: 'Prague Murders Map',
                href: '/agents/agent/projects/prague-murders-map',
                sourceHrefPrefixes: ['/agents/agent/projects/prague-murders-map'],
                title: 'Prague Murders Map',
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
                    isRunning: true,
                    projectUrl: 'https://website.example.com',
                },
            ],
        });

        expect(reference?.reference).toBe('website');
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
});
