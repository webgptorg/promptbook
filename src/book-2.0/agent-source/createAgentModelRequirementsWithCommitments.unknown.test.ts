import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';
import { validateBook } from './string_book';

describe('createAgentModelRequirementsWithCommitments unknown commitments', () => {
    it('adds unknown commitments as final system-message context without adding them to the prompt suffix', async () => {
        const agentSource = validateBook(spaceTrim(`
            Generic chatter

            GOAL Empathetic and understanding support bot whi
            GOAL Keep your projects up to date
            INITIAL MESSAGE Hello there!

            FOO
            Content of unknown commitment foo

            BAR BZZ
            Content of unknown commitment bar bzz

            CLOSED
        `));
        const unknownCommitmentContext = spaceTrim(`
            FOO
            Content of unknown commitment foo

            BAR BZZ
            Content of unknown commitment bar bzz
        `);

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.systemMessage).toContain('## Goal\n\nKeep your projects up to date');
        expect(requirements.systemMessage).not.toContain('Empathetic and understanding support bot whi');
        expect(requirements.systemMessage).toContain('## Sample of communication with the agent:');
        expect(requirements.systemMessage.endsWith(unknownCommitmentContext)).toBe(true);
        expect(requirements.promptSuffix).toBe('Keep your projects up to date');
        expect(requirements.isClosed).toBe(true);
    });
});
