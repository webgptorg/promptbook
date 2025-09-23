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

    /*
    TODO: !!!! Fix META IMAGE parsing
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
            profileImageUrl: 'https://img.url/pic.png',
        });
    });
    */

    /*
    TODO: !!!! Fix META IMAGE parsing
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
            profileImageUrl: 'https://img.url/pic.png',
        });
    });
    */

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
            meta: {
                image: expect.stringMatching(/gravatar/), // Should be a gravatar URL for 'Anonymous Agent'
            },
        });
        expect(parseAgentSource(validateBook('   '))).toEqual({
            agentName: null,
            parameters: [],
            personaDescription: null,
            meta: {
                image: expect.stringMatching(/gravatar/), // Should be a gravatar URL for 'Anonymous Agent'
            },
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

    it('parses agent with multiple META commitments', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar
                PERSONA A friendly AI assistant that helps you with your tasks
                META FOO foo
                META IMAGE ./picture.png
                META BAR bar
                META foo foo2
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toEqual({
            agentName: 'AI Avatar',
            personaDescription: 'A friendly AI assistant that helps you with your tasks',
            meta: {
                image: './picture.png',
                foo: 'foo2', // Later should override earlier
                bar: 'bar',
            },
            parameters: [],
        });
    });

    it('parses agent with only META FOO commitment', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar
                PERSONA A friendly AI assistant that helps you with your tasks
                META FOO foo
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toEqual({
            agentName: 'AI Avatar',
            personaDescription: 'A friendly AI assistant that helps you with your tasks',
            meta: {
                image: expect.stringMatching(/gravatar/), // Should be a gravatar URL fallback
                foo: 'foo',
            },
            parameters: [],
        });
    });

    it('handles META commitments with case variations', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Test Agent
                META TITLE Test Title
                META DESCRIPTION Test description
                META LINK https://example.com
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta).toEqual({
            image: expect.stringMatching(/gravatar/), // Should be a gravatar URL fallback
            title: 'Test Title',
            description: 'Test description',
            link: 'https://example.com',
        });
    });

    it('handles META commitments with multiline content', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Test Agent
                META DESCRIPTION This is a longer description
                that spans multiple lines
                with various content
                META TITLE Simple Title
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta.description).toContain('This is a longer description');
        expect(result.meta.description).toContain('multiple lines');
        expect(result.meta.title).toBe('Simple Title');
    });

    it('ensures later META commitments override earlier ones', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Test Agent
                META IMAGE first.png
                META TITLE First Title
                META IMAGE second.png
                META TITLE Second Title
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta).toEqual({
            image: 'second.png', // Should be overridden
            title: 'Second Title', // Should be overridden
        });
    });
});
