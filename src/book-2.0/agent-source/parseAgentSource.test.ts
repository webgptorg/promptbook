import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { parseAgentSource } from './parseAgentSource';
import { validateBook } from './string_book';

describe('parseAgentSource', () => {
    it('parses minimal agent source (only name)', () => {
        const agentSource = validateBook('Agent Name');
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('agent-name');
        expect(result.personaDescription).toBe(null);
        expect(result.meta.image).toMatch(/gravatar/); // Should be a gravatar URL
        expect(result.parameters).toEqual([]);
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
        expect(result).toMatchObject({
            agentName: 'agent-name',
            personaDescription: 'A helpful assistant',
            meta: {
                image: 'https://img.url/pic.png',
            },
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
        expect(result).toMatchObject({
            agentName: 'agent-name',
            personaDescription: 'A helpful assistant',
            meta: {
                image: 'https://img.url/pic.png',
            },
            parameters: [],
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
        expect(result.agentName).toBe('agent-name');
        expect(result.personaDescription).toBe(null);
        expect(result.meta.image).toMatch(/gravatar/); // Should be a gravatar URL
    });

    it('handles empty or whitespace input', () => {
        expect(parseAgentSource(validateBook(''))).toMatchObject({
            agentName: 'agent-9bee7d',
            parameters: [],
            personaDescription: null,
            meta: {
                image: expect.stringMatching(/gravatar/), // Should be a gravatar URL for 'Anonymous Agent'
            },
        });
        expect(parseAgentSource(validateBook('   '))).toEqual({
            agentName: 'agent-e3b0c4',
            agentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
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
        expect(result.agentName).toBe('agent-name');
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
        expect(result.agentName).toBe('agent-name');
        expect(result.personaDescription).toBe('');
        expect(result.meta.image).toMatch(/gravatar/); // Should be a gravatar URL
    });

    it('parses agent with custom META commitments', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar

                PERSONA A friendly AI assistant that helps you with your tasks
                META FOO foo
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toMatchObject({
            agentName: 'ai-avatar',
            personaDescription: 'A friendly AI assistant that helps you with your tasks',
            meta: {
                image: expect.stringMatching(/gravatar/), // Should be a gravatar URL fallback
                foo: 'foo',
            },
            parameters: [],
        });
    });

    it('parses agent with multiple META commitments and overrides', () => {
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
        expect(result).toMatchObject({
            agentName: 'ai-avatar',
            personaDescription: 'A friendly AI assistant that helps you with your tasks',
            meta: {
                image: './picture.png',
                foo: 'foo2', // Later should override earlier
                bar: 'bar',
            },
            parameters: [],
        });
    });

    it('handles META commitments case insensitively', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar
                META TITLE My Title
                META title Another Title
                META Link https://example.com
                META LINK https://example2.com
                META Description First description
                META DESCRIPTION Second description
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta).toEqual({
            image: expect.stringMatching(/gravatar/), // Should be a gravatar URL fallback
            title: 'Another Title', // Later should override earlier
            link: 'https://example2.com', // Later should override earlier
            description: 'Second description', // Later should override earlier
        });
    });

    it('parses INITIAL MESSAGE', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                INITIAL MESSAGE Hello! I am ready to help you.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.initialMessage).toBe('Hello! I am ready to help you.');
    });

    it('parses INITIAL MESSAGE with overrides', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                INITIAL MESSAGE First message
                INITIAL MESSAGE Second message (override)
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.initialMessage).toBe('Second message (override)');
    });
});
