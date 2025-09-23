import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { parseAgentSource } from './parseAgentSource';
import { validateBook } from './string_book';

describe('parseAgentSource', () => {
    it('parses minimal agent source (only name)', () => {
        const agentSource = validateBook('Agent Name');
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('Agent Name');
        expect(result.personaDescription).toBe(null);
        expect(result.meta.image).toMatch(/gravatar/); // Should be a gravatar URL
    });

    it('parses agent with persona and profile image', () => {
        const agentSource = validateBook(
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
            meta: { image: 'https://img.url/pic.png' },
            parameters: [],
        });
    });

    it('parses agent with system message lines', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA A helpful assistant
                META IMAGE https://img.url/pic.png
                NOTE This is a note
                And another line of note
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toEqual({
            agentName: 'Agent Name',
            personaDescription: 'A helpful assistant',
            meta: { image: 'https://img.url/pic.png' },
            parameters: [],
        });
    });

    it('parses all types of META commitments', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA A professional assistant
                META IMAGE https://example.com/avatar.jpg
                META LINK https://twitter.com/username
                META TITLE Senior Business Consultant
                META DESCRIPTION Specialized in strategic planning
                META AUTHOR John Doe
                META VERSION 1.0
                NOTE Some notes here
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toEqual({
            agentName: 'Agent Name',
            personaDescription: 'A professional assistant',
            meta: {
                image: 'https://example.com/avatar.jpg',
                link: 'https://twitter.com/username',
                title: 'Senior Business Consultant',
                description: 'Specialized in strategic planning',
                author: 'John Doe',
                version: '1.0',
            },
            parameters: [],
        });
    });

    it('handles multiple META LINK commitments', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA A developer
                META IMAGE https://example.com/dev.jpg
                META LINK https://github.com/dev
                META LINK https://twitter.com/dev
                META TITLE Full Stack Developer
            `),
        );
        const result = parseAgentSource(agentSource);
        // Note: Based on current implementation, last META LINK takes precedence
        // This could be enhanced later to support multiple links as an array
        expect(result.meta.link).toBe('https://twitter.com/dev');
        expect(result.meta.image).toBe('https://example.com/dev.jpg');
        expect(result.meta.title).toBe('Full Stack Developer');
    });

    it('handles custom META commitments', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA A creative assistant
                META STYLE Friendly and approachable
                META SPECIALTY Creative writing
                META EXPERIENCE 5 years
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta).toEqual({
            image: expect.stringMatching(/gravatar/), // Fallback
            style: 'Friendly and approachable',
            specialty: 'Creative writing',
            experience: '5 years',
        });
    });

    it('parses agent with only system message', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                This is a system message.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('Agent Name');
        expect(result.personaDescription).toBe(null);
        expect(result.meta.image).toMatch(/gravatar/); // Should be a gravatar URL
    });

    it('handles empty or whitespace input', () => {
        expect(parseAgentSource(validateBook(''))).toEqual({
            agentName: null,
            parameters: [],
            personaDescription: null,
            meta: { image: expect.stringMatching(/gravatar/) }, // Should be a gravatar URL for 'Anonymous Agent'
        });
        expect(parseAgentSource(validateBook('   '))).toEqual({
            agentName: null,
            parameters: [],
            personaDescription: null,
            meta: { image: expect.stringMatching(/gravatar/) }, // Should be a gravatar URL for 'Anonymous Agent'
        });
    });

    it('handles blank lines in system message', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name

                This is a system message.

                Another line.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('Agent Name');
        expect(result.personaDescription).toBe(null);
        expect(result.meta.image).toMatch(/gravatar/); // Should be a gravatar URL
    });

    it('ignores malformed PERSONA and META IMAGE lines', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA
                META IMAGE
                NOTE Some random note
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('Agent Name');
        expect(result.personaDescription).toBe('');
        expect(result.meta.image).toMatch(/gravatar/); // Should be a gravatar URL
    });
});
