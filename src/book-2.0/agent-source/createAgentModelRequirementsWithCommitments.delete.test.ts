import { describe, expect, it } from '@jest/globals';
import { validateBook } from './string_book';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';

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
        // Below knowledge kept
        expect(modelRequirements.systemMessage).toContain('second knowledge below');
        // Ensure a Knowledge line exists for the remaining one
        expect(modelRequirements.systemMessage).toMatch(/Knowledge:/);
    });
});
