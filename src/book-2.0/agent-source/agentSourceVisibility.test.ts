import { describe, expect, it } from '@jest/globals';
import { ParseError } from '../../errors/ParseError';
import { parseAgentSourceVisibility, setAgentSourceVisibility } from './agentSourceVisibility';
import type { string_book } from './string_book';

describe('agentSourceVisibility', () => {
    it('parses META VISIBILITY case-insensitively and trims whitespace', () => {
        const agentSource = `
Helper Agent
META VISIBILITY   public
` as string_book;

        expect(parseAgentSourceVisibility(agentSource, { isStrict: true })).toBe('PUBLIC');
    });

    it('inserts META VISIBILITY after the agent title', () => {
        const agentSource = `
Helper Agent

GOAL Help with testing.
` as string_book;

        expect(setAgentSourceVisibility(agentSource, 'PRIVATE')).toBe(`
Helper Agent
META VISIBILITY PRIVATE

GOAL Help with testing.
`);
    });

    it('normalizes one META VISIBILITY line and removes duplicates', () => {
        const agentSource = `
Helper Agent
META VISIBILITY private
GOAL Help with testing.
META VISIBILITY PUBLIC
` as string_book;

        expect(setAgentSourceVisibility(agentSource, 'UNLISTED')).toBe(`
Helper Agent
META VISIBILITY UNLISTED
GOAL Help with testing.
`);
    });

    it('throws a branded error for invalid strict META VISIBILITY values', () => {
        const agentSource = `
Helper Agent
META VISIBILITY FRIENDS_ONLY
` as string_book;

        expect(() => parseAgentSourceVisibility(agentSource, { isStrict: true })).toThrow(ParseError);
    });
});
