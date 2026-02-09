import { describe, expect, it } from '@jest/globals';
import { validateBook } from './string_book';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';
import { parseDataUrlKnowledgeSource } from '../../utils/knowledge/inlineKnowledgeSource';

describe('DELETE commitment invalidates prior tagged commitments', () => {
    it('example: DELETE @Example removes earlier @Example KNOWLEDGE', async () => {
        const book = validateBook(`AI agent

KNOWLEDGE @Example https://example.com
PERSONA Friendly assistant
DELETE @Example`);

        const modelRequirements = await createAgentModelRequirementsWithCommitments(book);

        expect(modelRequirements.systemMessage).toContain('Friendly assistant');
        expect(modelRequirements.systemMessage).not.toContain('Knowledge:');
        expect(modelRequirements.systemMessage).not.toContain('@Example');
        expect(modelRequirements.systemMessage).not.toContain('example.com');
    });

    it('only invalidates commitments above; below commitments remain', async () => {
        const book = validateBook(`AI agent

KNOWLEDGE @X First knowledge above
DELETE {X}
KNOWLEDGE {X: second knowledge below}`);

        const modelRequirements = await createAgentModelRequirementsWithCommitments(book);

        // Above knowledge removed
        expect(modelRequirements.systemMessage).not.toContain('First knowledge above');
        // Below knowledge kept via data URL knowledge source; system message only includes the reference
        expect(modelRequirements.systemMessage).toContain('Knowledge Source Inline');
        expect(modelRequirements.knowledgeSources).toBeDefined();
        const inlineSource = (modelRequirements.knowledgeSources ?? []).find((source) =>
            source.startsWith('data:text/plain'),
        );
        expect(inlineSource).toBeDefined();
        const parsedInline = inlineSource ? parseDataUrlKnowledgeSource(inlineSource) : null;
        expect(parsedInline).not.toBeNull();
        expect(parsedInline?.buffer.toString('utf-8')).toContain('second knowledge below');
    });
});
