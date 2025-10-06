import { describe, expect, it } from '@jest/globals';
import { validateBook } from './string_book';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';

describe('DELETE commitment invalidates prior tagged commitments', () => {
    it('example: DELETE @Example removes earlier @Example KNOWLEDGE', async () => {
        const book = validateBook(`AI agent

KNOWLEDGE @Example https://example.com
PERSONA Friendly assistant
DELETE @Example`);

        const reqs = await createAgentModelRequirementsWithCommitments(book);

        expect(reqs.systemMessage).toContain('Friendly assistant');
        expect(reqs.systemMessage).not.toContain('Knowledge:');
        expect(reqs.systemMessage).not.toContain('@Example');
        expect(reqs.systemMessage).not.toContain('example.com');
    });

    it('only invalidates commitments above; below commitments remain', async () => {
        const book = validateBook(`AI agent

KNOWLEDGE @X First knowledge above
DELETE {X}
KNOWLEDGE {X: second knowledge below}`);

        const reqs = await createAgentModelRequirementsWithCommitments(book);

        // Above knowledge removed
        expect(reqs.systemMessage).not.toContain('First knowledge above');
        // Below knowledge kept
        expect(reqs.systemMessage).toContain('second knowledge below');
        // Ensure a Knowledge line exists for the remaining one
        expect(reqs.systemMessage).toMatch(/Knowledge:/);
    });
});
