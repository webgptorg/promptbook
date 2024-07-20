import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { promptbookVersionCommandParser } from './promptbookVersionCommandParser';

describe('how PROMPTBOOK_VERSION command in .ptbk.md files works', () => {
    it('should parse PROMPTBOOK_VERSION command', () => {
        expect(parseCommand('PROMPTBOOK_VERSION foo')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            value: 'foo',
        });
        expect(parseCommand('PROMPTBOOK_VERSION bar')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            value: 'bar',
        });
    });

    it('should parse PROMPTBOOK_VERSION command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            value: 'bar',
        });
    });

    it('should fail parsing PROMPTBOOK_VERSION command', () => {
        expect(() => parseCommand('PROMPTBOOK_VERSION')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('PROMPTBOOK_VERSION brr')).toThrowError(
            /PROMPTBOOK_VERSION value can not contain brr/i,
        );
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of promptbookVersionCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
