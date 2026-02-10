import { describe, expect, it, jest } from '@jest/globals';
import type { AgentReferenceResolver } from './agentReferenceResolver';
import { validateBook } from './string_book';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';

describe('createAgentModelRequirementsWithCommitments agent reference resolver', () => {
    it('resolves agent references before applying FROM', async () => {
        const resolver: AgentReferenceResolver = {
            resolveCommitmentContent: jest.fn(async () => 'https://example.com/agents/resolved'),
        };

        const book = validateBook(`
            Sample Agent

            FROM {foo}
        `);

        const modelRequirements = await createAgentModelRequirementsWithCommitments(book, undefined, {
            agentReferenceResolver: resolver,
        });

        expect(modelRequirements.parentAgentUrl).toBe('https://example.com/agents/resolved');
        expect(resolver.resolveCommitmentContent).toHaveBeenCalledWith('FROM', '{foo}');
    });
});
