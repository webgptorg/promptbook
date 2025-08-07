import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { parseAgentSource } from './parseAgentSource';
import { createAgentSource } from './string_agent_source';

describe('parseAgentSource', () => {
    it('parses minimal agent source (only name)', () => {
        const agentSource = createAgentSource('Agent Name');
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('Agent Name');
        expect(result.personaDescription).toBe(null);
        expect(result.profileImageUrl).toMatch(/gravatar/); // Should be a gravatar URL
    });

    it('parses agent with persona and profile image', () => {
        const agentSource = createAgentSource(
            spaceTrim(`
                Agent Name
                PERSONA A helpful assistant
                META IMAGE https://img.url/pic.png
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toEqual({
            agentName: 'Agent Name',
            personaDescription: 'A helpful assistant',
            profileImageUrl: 'https://img.url/pic.png',
        });
    });

    it('parses agent with system message lines', () => {
        const agentSource = createAgentSource(
            spaceTrim(`
                Agent Name
                PERSONA A helpful assistant
                META IMAGE https://img.url/pic.png
                This is a system message.
                Another line.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toEqual({
            agentName: 'Agent Name',
            personaDescription: 'A helpful assistant',
            profileImageUrl: 'https://img.url/pic.png',
        });
    });

    it('parses agent with only system message', () => {
        const agentSource = createAgentSource(
            spaceTrim(`
                Agent Name
                This is a system message.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('Agent Name');
        expect(result.personaDescription).toBe(null);
        expect(result.profileImageUrl).toMatch(/gravatar/); // Should be a gravatar URL
    });

    it('handles empty or whitespace input', () => {
        expect(parseAgentSource(createAgentSource(''))).toEqual({
            agentName: null,
            personaDescription: null,
            profileImageUrl: expect.stringMatching(/gravatar/), // Should be a gravatar URL for 'Anonymous Agent'
        });
        expect(parseAgentSource(createAgentSource('   '))).toEqual({
            agentName: null,
            personaDescription: null,
            profileImageUrl: expect.stringMatching(/gravatar/), // Should be a gravatar URL for 'Anonymous Agent'
        });
    });

    it('handles blank lines in system message', () => {
        const agentSource = createAgentSource(
            spaceTrim(`
                Agent Name

                This is a system message.

                Another line.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('Agent Name');
        expect(result.personaDescription).toBe(null);
        expect(result.profileImageUrl).toMatch(/gravatar/); // Should be a gravatar URL
    });

    it('ignores malformed PERSONA and META IMAGE lines', () => {
        const agentSource = createAgentSource(
            spaceTrim(`
                Agent Name
                PERSONA
                META IMAGE
                System message.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('Agent Name');
        expect(result.personaDescription).toBe(null);
        expect(result.profileImageUrl).toMatch(/gravatar/); // Should be a gravatar URL
    });
});
