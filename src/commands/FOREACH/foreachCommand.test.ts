import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { foreachCommandParser } from './foreachCommandParser';

describe('how FOREACH command in .ptbk.md files works', () => {

    it('should parse FOREACH command in PIPELINE_TEMPLATE', () => {
        expect(parseCommand('FOREACH foo', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            value: 'foo',
        });
        expect(parseCommand('FOREACH bar', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            value: 'bar',
        });
    });

    it('should parse FOREACH command in shortcut form', () => {
        expect(parseCommand('EACH foo', 'PIPELINE_HEAD')).toEqual({
            type: 'FOREACH',
            value: 'foo',
        });
        expect(parseCommand('EACH bar', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            value: 'bar',
        });
    });

    it('should fail parsing FOREACH command', () => {
        expect(() => parseCommand('FOREACH', 'PIPELINE_HEAD')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('FOREACH brr', 'PIPELINE_HEAD')).toThrowError(
            /FOREACH value can not contain brr/i,
        );
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of foreachCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
