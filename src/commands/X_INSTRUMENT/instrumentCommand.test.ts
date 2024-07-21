import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { instrumentCommandParser } from './instrumentCommandParser';

describe('how INSTRUMENT command in .ptbk.md files works', () => {
    it('should parse INSTRUMENT command in PIPELINE_HEAD', () => {
        expect(parseCommand('INSTRUMENT foo', 'PIPELINE_HEAD')).toEqual({
            type: 'INSTRUMENT',
            value: 'foo',
        });
        expect(parseCommand('INSTRUMENT bar', 'PIPELINE_HEAD')).toEqual({
            type: 'INSTRUMENT',
            value: 'bar',
        });
    });

    it('should parse INSTRUMENT command in shortcut form', () => {
        expect(parseCommand('BP foo', 'PIPELINE_HEAD')).toEqual({
            type: 'INSTRUMENT',
            value: 'foo',
        });
        expect(parseCommand('BP bar', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'INSTRUMENT',
            value: 'bar',
        });
    });

    it('should fail parsing INSTRUMENT command', () => {
        expect(() => parseCommand('INSTRUMENT', 'PIPELINE_HEAD')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('INSTRUMENT brr', 'PIPELINE_HEAD')).toThrowError(
            /INSTRUMENT value can not contain brr/i,
        );
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of instrumentCommandParser.examples) {
            // @@
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
