import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { jokerCommandParser } from './jokerCommandParser';

describe('how JOKER command in .ptbk.md files works', () => {
    it('should parse JOKER command', () => {
        expect(parseCommand('JOKER foo')).toEqual({
            type: 'JOKER',
            value: 'foo',
        });
        expect(parseCommand('JOKER bar')).toEqual({
            type: 'JOKER',
            value: 'bar',
        });
    });

    it('should parse JOKER command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'JOKER',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'JOKER',
            value: 'bar',
        });
    });

    it('should fail parsing JOKER command', () => {
        expect(() => parseCommand('JOKER')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('JOKER brr')).toThrowError(/JOKER value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of jokerCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
