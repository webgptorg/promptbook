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
                title: 'Marketing website',
            },
        ]);
    });

    it('falls back to the project directory name when display metadata is empty', () => {
        expect(
            createAgentProjectMarkdownReferences({
                agentPermanentId: 'agent',
                projects: [
                    {
                        projectName: 'project-a',
                        displayName: '',
                        description: '',
                    },
                ],
            }),
        ).toEqual([
            {
                reference: 'project-a',
                label: 'project-a',
                href: '/agents/agent/projects/project-a',
                title: 'project-a',
            },
        ]);
    });
});
