import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { actionCommandParser } from './actionCommandParser';

describe('how ACTION command in .ptbk.md files works', () => {
    it('should parse ACTION command in PIPELINE_HEAD', () => {
        expect(parseCommand('ACTION foo', 'PIPELINE_HEAD')).toEqual({
            type: 'ACTION',
            value: 'foo',
        });
        expect(parseCommand('ACTION bar', 'PIPELINE_HEAD')).toEqual({
            type: 'ACTION',
            value: 'bar',
        });
    });


    it('should parse ACTION command in shortcut form', () => {
        expect(parseCommand('BP foo', 'PIPELINE_HEAD')).toEqual({
            type: 'ACTION',
            value: 'foo',
        });
        expect(parseCommand('BP bar', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'ACTION',
            value: 'bar',
        });
    });

    it('should fail parsing ACTION command', () => {
        expect(() => parseCommand('ACTION', 'PIPELINE_HEAD')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('ACTION brr', 'PIPELINE_HEAD')).toThrowError(/ACTION value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of actionCommandParser.examples) {
            // @@
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
