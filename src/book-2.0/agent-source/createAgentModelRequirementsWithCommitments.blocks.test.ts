import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';
import { validateBook } from './string_book';

describe('createAgentModelRequirementsWithCommitments with code blocks in commitments', () => {
    it('should include code blocks in the system message for RULE', async () => {
        const agentSource = validateBook(spaceTrim(`
            AI Agent

            RULE Write poems.

            \`\`\`
            Roses are red,
            Violets are blue,
            Sugar is sweet,
            And so are you.
            \`\`\`
        `));

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.systemMessage).toContain('Rule: Write poems.');
        expect(requirements.systemMessage).toContain('\`\`\`\nRoses are red,\nViolets are blue,\nSugar is sweet,\nAnd so are you.\n\`\`\`');
    });

    it('should include code blocks in notes metadata for NOTE', async () => {
        const agentSource = validateBook(spaceTrim(`
            AI Agent

            NOTE This is a note

            \`\`\`
            Nested code
            \`\`\`
        `));

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.notes).toBeDefined();
        expect(requirements.notes![0]).toContain('This is a note');
        expect(requirements.notes![0]).toContain('\`\`\`\nNested code\n\`\`\`');
    });
});
