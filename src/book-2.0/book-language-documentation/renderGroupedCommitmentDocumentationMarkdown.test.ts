import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from '../../commitments/_common/getGroupedCommitmentDefinitions';
import { renderGroupedCommitmentDocumentationMarkdown } from './renderGroupedCommitmentDocumentationMarkdown';

describe('renderGroupedCommitmentDocumentationMarkdown', () => {
    it('renders OPEN and CLOSED together as one documentation family', () => {
        const openGroup = getGroupedCommitmentDefinitions().find((group) => group.primary.type === 'OPEN');

        expect(openGroup).toBeDefined();

        const markdown = renderGroupedCommitmentDocumentationMarkdown(openGroup!);

        expect(markdown).toContain('## OPEN');
        expect(markdown).toContain('## CLOSED');
        expect(markdown).toContain('This is the default behavior if neither `OPEN` nor `CLOSED` is specified.');
        expect(markdown).toContain('By default (if not specified), agents are `OPEN` to modification.');
    });

    it('nests every heading under the host document heading level', () => {
        const openGroup = getGroupedCommitmentDefinitions().find((group) => group.primary.type === 'OPEN');
        const goalGroup = getGroupedCommitmentDefinitions().find((group) => group.primary.type === 'GOAL');

        const openMarkdown = renderGroupedCommitmentDocumentationMarkdown(openGroup!, 2);
        const goalMarkdown = renderGroupedCommitmentDocumentationMarkdown(goalGroup!, 2);

        expect(openMarkdown).toContain('#### OPEN');
        expect(openMarkdown).toContain('##### Example');
        expect(goalMarkdown).toContain('#### Key aspects');
        expect(goalMarkdown).not.toMatch(/^##\s/m);
    });

    it('keeps regular commitment docs as a single stripped markdown block', () => {
        const goalGroup = getGroupedCommitmentDefinitions().find((group) => group.primary.type === 'GOAL');

        expect(goalGroup).toBeDefined();

        const markdown = renderGroupedCommitmentDocumentationMarkdown(goalGroup!);

        expect(markdown).not.toContain('## OPEN');
        expect(markdown).not.toContain('## CLOSED');
        expect(markdown).not.toContain('# GOAL');
        expect(markdown).toContain('Defines the main goal which should be achieved by the AI assistant.');
    });

    it('focuses examples that do not define an agent title', () => {
        const internalMessageGroup = getGroupedCommitmentDefinitions().find(
            (group) => group.primary.type === 'INTERNAL MESSAGE',
        );

        expect(internalMessageGroup).toBeDefined();

        const markdown = renderGroupedCommitmentDocumentationMarkdown(internalMessageGroup!);

        expect(markdown).toContain(
            spaceTrim(`
            \`\`\`book
            INTERNAL MESSAGE {
        `),
        );
        expect(markdown).toContain('\nCLOSED\n```');
        expect(markdown).not.toContain(
            spaceTrim(`
            \`\`\`book
            USER MESSAGE
        `),
        );
    });

    it('focuses compound commitment keywords before their shorter prefixes', () => {
        const metaVoiceGroup = getGroupedCommitmentDefinitions().find((group) => group.primary.type === 'META VOICE');

        expect(metaVoiceGroup).toBeDefined();

        const markdown = renderGroupedCommitmentDocumentationMarkdown(metaVoiceGroup!);

        expect(markdown).toContain(
            spaceTrim(`
            \`\`\`book
            Friendly Assistant

            META VOICE 21m00Tcm4TlvDq8ikWAM

            CLOSED
            \`\`\`
        `),
        );
        expect(markdown).not.toContain(
            spaceTrim(`
            \`\`\`book
            Friendly Assistant

            META VOICE 21m00Tcm4TlvDq8ikWAM
            PERSONA
        `),
        );
    });
});
