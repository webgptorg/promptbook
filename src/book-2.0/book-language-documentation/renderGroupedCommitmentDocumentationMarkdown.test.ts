import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from '../../commitments/_common/getGroupedCommitmentDefinitions';
import { renderGroupedCommitmentDocumentationMarkdown } from './renderGroupedCommitmentDocumentationMarkdown';

describe('renderGroupedCommitmentDocumentationMarkdown', () => {
    it('renders OPEN and CLOSED together as one documentation family', () => {
        const openGroup = getGroupedCommitmentDefinitions().find((group) => group.primary.type === 'OPEN');

        expect(openGroup).toBeDefined();

        const markdown = renderGroupedCommitmentDocumentationMarkdown(openGroup!);

        expect(markdown).toContain('#### OPEN');
        expect(markdown).toContain('#### CLOSED');
        expect(markdown).toContain('This is the default behavior if neither `OPEN` nor `CLOSED` is specified.');
        expect(markdown).toContain('By default (if not specified), agents are `OPEN` to modification.');
    });

    it('keeps regular commitment docs as a single stripped markdown block', () => {
        const goalGroup = getGroupedCommitmentDefinitions().find((group) => group.primary.type === 'GOAL');

        expect(goalGroup).toBeDefined();

        const markdown = renderGroupedCommitmentDocumentationMarkdown(goalGroup!);

        expect(markdown).not.toContain('#### OPEN');
        expect(markdown).not.toContain('#### CLOSED');
        expect(markdown).not.toContain('# GOAL');
        expect(markdown).toContain('Defines the main goal which should be achieved by the AI assistant.');
    });
});
