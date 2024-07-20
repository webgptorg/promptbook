import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { modelCommandParser } from './modelCommandParser';

describe('how MODEL command in .ptbk.md files works', () => {
    it('should parse MODEL command', () => {
        expect(parseCommand('MODEL foo')).toEqual({
            type: 'MODEL',
            value: 'foo',
        });
        expect(parseCommand('MODEL bar')).toEqual({
            type: 'MODEL',
            value: 'bar',
        });
    });

    it('should parse MODEL command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'MODEL',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'MODEL',
            value: 'bar',
        });
    });

    it('should fail parsing MODEL command', () => {
        expect(() => parseCommand('MODEL')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('MODEL brr')).toThrowError(/MODEL value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of modelCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
