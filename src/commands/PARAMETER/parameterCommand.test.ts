import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { parameterCommandParser } from './parameterCommandParser';

describe('how PARAMETER command in .ptbk.md files works', () => {
    it('should parse PARAMETER command', () => {
        expect(parseCommand('PARAMETER foo')).toEqual({
            type: 'PARAMETER',
            value: 'foo',
        });
        expect(parseCommand('PARAMETER bar')).toEqual({
            type: 'PARAMETER',
            value: 'bar',
        });
    });

    it('should parse PARAMETER command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'PARAMETER',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'PARAMETER',
            value: 'bar',
        });
    });

    it('should fail parsing PARAMETER command', () => {
        expect(() => parseCommand('PARAMETER')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('PARAMETER brr')).toThrowError(/PARAMETER value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of parameterCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
