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
        expect(result.profileImageUrl).toMatch(/gravatar/); // Should be a gravatar URL
        expect(result.meta).toEqual({});
        expect(result.parameters).toEqual([]);
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
        expect(result.profileImageUrl).toMatch(/gravatar/); // Should be a gravatar URL
        expect(result.meta).toEqual({});
        expect(result.parameters).toEqual([]);
    });

    it('handles empty or whitespace input', () => {
        expect(parseAgentSource(validateBook(''))).toEqual({
            agentName: null,
            personaDescription: null,
            profileImageUrl: expect.stringMatching(/gravatar/), // Should be a gravatar URL for 'Anonymous Agent'
            meta: {},
            parameters: [],
        });
        expect(parseAgentSource(validateBook('   '))).toEqual({
            agentName: null,
            personaDescription: null,
            profileImageUrl: expect.stringMatching(/gravatar/), // Should be a gravatar URL for 'Anonymous Agent'
            meta: {},
            parameters: [],
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
        expect(result.profileImageUrl).toMatch(/gravatar/); // Should be a gravatar URL
        expect(result.meta).toEqual({});
        expect(result.parameters).toEqual([]);
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
        expect(result.profileImageUrl).toMatch(/gravatar/); // Should be a gravatar URL
        expect(result.meta).toEqual({});
        expect(result.parameters).toEqual([]);
    });

    // New comprehensive tests for META commitment parsing

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
            meta: {
                image: 'https://img.url/pic.png',
            },
            parameters: [],
        });
    });

    it('parses all types of META commitments', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA A helpful assistant
                META IMAGE https://img.url/pic.png
                META LINK https://twitter.com/user
                META TITLE Professional Assistant
                META DESCRIPTION An AI assistant specialized in business tasks
                META AUTHOR John Doe
                META VERSION 1.0
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toEqual({
            agentName: 'Agent Name',
            personaDescription: 'A helpful assistant',
            profileImageUrl: 'https://img.url/pic.png',
            meta: {
                image: 'https://img.url/pic.png',
                link: 'https://twitter.com/user',
                title: 'Professional Assistant',
                description: 'An AI assistant specialized in business tasks',
                author: 'John Doe',
                version: '1.0',
            },
            parameters: [],
        });
    });

    it('handles multiple META commitments of the same type (last one wins)', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                META TITLE First Title
                META TITLE Second Title
                META IMAGE first-image.png
                META IMAGE second-image.png
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta.title).toBe('Second Title');
        expect(result.meta.image).toBe('second-image.png');
        expect(result.profileImageUrl).toBe('second-image.png');
    });

    it('handles custom META types', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                META CUSTOM_FIELD Custom Value
                META LICENSE MIT
                META CATEGORY Productivity
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta).toEqual({
            custom_field: 'Custom Value',
            license: 'MIT',
            category: 'Productivity',
        });
    });

    it('ignores empty META commitments', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                META TITLE
                META IMAGE
                META DESCRIPTION Valid Description
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta).toEqual({
            description: 'Valid Description',
        });
    });
});
