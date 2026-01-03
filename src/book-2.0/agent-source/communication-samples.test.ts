import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { parseAgentSource } from './parseAgentSource';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';
import { validateBook } from './string_book';

describe('communication samples into system message', () => {
    it('should extract USER MESSAGE and AGENT MESSAGE pairs', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Zdeněk Nesvadba

                META COLOR #ff8c00
                PERSONA Profesionální a efektivní virtuální asistent.
                RULE Vždy upřednostňujte soukromí uživatelů a bezpečnost dat.

                ---

                USER MESSAGE
                Hello, can you tell me about yourself?

                AGENT MESSAGE
                Hello! I am a professional and efficient virtual assistant. My main goal is to help you with your tasks by providing information, managing your data, and ensuring your privacy and security. If you have any specific questions or need assistance, feel free to ask!
            `),
        );

        const result = parseAgentSource(agentSource);
        expect(result.samples).toHaveLength(1);
        expect(result.samples[0]).toEqual({
            question: 'Hello, can you tell me about yourself?',
            answer: 'Hello! I am a professional and efficient virtual assistant. My main goal is to help you with your tasks by providing information, managing your data, and ensuring your privacy and security. If you have any specific questions or need assistance, feel free to ask!',
        });
    });

    it('should include INITIAL MESSAGE and samples in the system message', async () => {
        const agentSource = validateBook(
            spaceTrim(`
                Zdeněk Nesvadba

                PERSONA Profesionální a efektivní virtuální asistent.
                INITIAL MESSAGE I am ready to help.

                USER MESSAGE
                Hello
                AGENT MESSAGE
                Hi there!
            `),
        );

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.systemMessage).toContain('Example interaction:');
        expect(requirements.systemMessage).toContain('Agent: I am ready to help.');
        expect(requirements.systemMessage).toContain('User: Hello\nAgent: Hi there!');
    });

    it('should NOT include horizontal lines in the system message', async () => {
        const agentSource = validateBook(
            spaceTrim(`
                Zdeněk Nesvadba

                ---

                USER MESSAGE
                Hello
                AGENT MESSAGE
                Hi
            `),
        );

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.systemMessage).not.toContain('---');
    });

    it('should handle multiple pairs correctly', async () => {
        const agentSource = validateBook(
            spaceTrim(`
                Test Agent

                USER MESSAGE
                One
                AGENT MESSAGE
                Two

                USER MESSAGE
                Three
                AGENT MESSAGE
                Four
            `),
        );

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.systemMessage).toContain('User: One\nAgent: Two');
        expect(requirements.systemMessage).toContain('User: Three\nAgent: Four');
    });
});
