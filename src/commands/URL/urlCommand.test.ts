import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { urlCommandParser } from './urlCommandParser';

describe('how URL command in .ptbk.md files works', () => {
    it('should parse URL command', () => {
        expect(parseCommand('URL foo')).toEqual({
            type: 'URL',
            value: 'foo',
        });
        expect(parseCommand('URL bar')).toEqual({
            type: 'URL',
            value: 'bar',
        });
    });

    it('should parse URL command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'URL',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'URL',
            value: 'bar',
        });
    });

    it('should fail parsing URL command', () => {
        expect(() => parseCommand('URL')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('URL brr')).toThrowError(/URL value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of urlCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
