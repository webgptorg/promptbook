import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { postprocessingCommandParser } from './postprocessingCommandParser';

describe('how POSTPROCESSING command in .ptbk.md files works', () => {
    it('should parse POSTPROCESSING command', () => {
        expect(parseCommand('POSTPROCESSING foo')).toEqual({
            type: 'POSTPROCESSING',
            value: 'foo',
        });
        expect(parseCommand('POSTPROCESSING bar')).toEqual({
            type: 'POSTPROCESSING',
            value: 'bar',
        });
    });

    it('should parse POSTPROCESSING command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'POSTPROCESSING',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'POSTPROCESSING',
            value: 'bar',
        });
    });

    it('should fail parsing POSTPROCESSING command', () => {
        expect(() => parseCommand('POSTPROCESSING')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('POSTPROCESSING brr')).toThrowError(/POSTPROCESSING value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of postprocessingCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
