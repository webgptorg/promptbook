import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { sampleCommandParser } from './sampleCommandParser';

describe('how SAMPLE command in .ptbk.md files works', () => {
    it('should parse SAMPLE command', () => {
        expect(parseCommand('SAMPLE foo')).toEqual({
            type: 'SAMPLE',
            value: 'foo',
        });
        expect(parseCommand('SAMPLE bar')).toEqual({
            type: 'SAMPLE',
            value: 'bar',
        });
    });

    it('should parse SAMPLE command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'SAMPLE',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'SAMPLE',
            value: 'bar',
        });
    });

    it('should fail parsing SAMPLE command', () => {
        expect(() => parseCommand('SAMPLE')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('SAMPLE brr')).toThrowError(/SAMPLE value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of sampleCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
