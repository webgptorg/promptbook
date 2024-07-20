import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { boilerplateCommandParser } from './boilerplateCommandParser';

describe('how BOILERPLATE command in .ptbk.md files works', () => {
    it('should parse BOILERPLATE command', () => {
        expect(parseCommand('BOILERPLATE foo')).toEqual({
            type: 'BOILERPLATE',
            value: 'foo',
        });
        expect(parseCommand('BOILERPLATE bar')).toEqual({
            type: 'BOILERPLATE',
            value: 'bar',
        });
    });

    it('should parse BOILERPLATE command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'BOILERPLATE',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'BOILERPLATE',
            value: 'bar',
        });
    });

    it('should fail parsing BOILERPLATE command', () => {
        expect(() => parseCommand('BOILERPLATE')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('BOILERPLATE brr')).toThrowError(/BOILERPLATE value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of boilerplateCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
