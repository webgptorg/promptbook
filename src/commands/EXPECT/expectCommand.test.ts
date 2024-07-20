import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { expectCommandParser } from './expectCommandParser';

describe('how EXPECT command in .ptbk.md files works', () => {
    it('should parse EXPECT command', () => {
        expect(parseCommand('EXPECT foo')).toEqual({
            type: 'EXPECT',
            value: 'foo',
        });
        expect(parseCommand('EXPECT bar')).toEqual({
            type: 'EXPECT',
            value: 'bar',
        });
    });

    it('should parse EXPECT command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'EXPECT',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'EXPECT',
            value: 'bar',
        });
    });

    it('should fail parsing EXPECT command', () => {
        expect(() => parseCommand('EXPECT')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('EXPECT brr')).toThrowError(/EXPECT value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of expectCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
