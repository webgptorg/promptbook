import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { jokerCommandParser } from './jokerCommandParser';

describe('how JOKER command in .ptbk.md files works', () => {
    it('should parse JOKER command', () => {
        expect(parseCommand('joker {name}')).toEqual({
            type: 'JOKER',
            parameterName: 'name',
        });
        expect(parseCommand('JOKER {woooow}')).toEqual({
            type: 'JOKER',
            parameterName: 'woooow',
        });
    });
    it('should fail parsing JOKER command', () => {
        expect(() => parseCommand('JOKER')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('JOKER name')).toThrowError(/JOKER must reference a parameter/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of jokerCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
