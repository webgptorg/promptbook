import { describe, expect, it } from '@jest/globals';
import { parseDataUrlKnowledgeSource } from '../../utils/knowledge/inlineKnowledgeSource';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';
import { validateBook } from './string_book';

describe('createAgentModelRequirementsWithCommitments with KNOWLEDGE', () => {
    it('keeps mixed text and embedded URLs as knowledge', async () => {
        const book = validateBook(`Agent

KNOWLEDGE Read https://example.com/alpha.pdf and https://example.com/beta.txt before answering.
`);

        const requirements = await createAgentModelRequirementsWithCommitments(book);
        const sources = requirements.knowledgeSources ?? [];
        const inlineSource = sources.find((source) => source.startsWith('data:text/plain'));

        expect(sources).toContain('https://example.com/alpha.pdf');
        expect(sources).toContain('https://example.com/beta.txt');
        expect(inlineSource).toBeDefined();
        expect(requirements.systemMessage).toContain('Knowledge Source URL: https://example.com/alpha.pdf');
        expect(requirements.systemMessage).toContain('Knowledge Source URL: https://example.com/beta.txt');
        expect(requirements.systemMessage).toContain('Knowledge Source Inline');

        const parsedInline = inlineSource ? parseDataUrlKnowledgeSource(inlineSource) : null;
        expect(parsedInline?.buffer.toString('utf-8')).toContain('Read https://example.com/alpha.pdf');
    });

    it('treats URL-only knowledge as URL sources without creating inline data file', async () => {
        const book = validateBook(`Agent

KNOWLEDGE https://example.com/alpha.pdf https://example.com/beta.txt
`);

        const requirements = await createAgentModelRequirementsWithCommitments(book);
        const sources = requirements.knowledgeSources ?? [];

        expect(sources).toEqual(['https://example.com/alpha.pdf', 'https://example.com/beta.txt']);
        expect(requirements.systemMessage).not.toContain('Knowledge Source Inline');
    });
});
