import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { formfactorCommandParser } from './formfactorCommandParser';

describe('how FORMFACTOR command in .book.md files works', () => {
    it('should parse FORMFACTOR command in PIPELINE_HEAD', () => {
        expect(parseCommand('FORMFACTOR foo', 'PIPELINE_HEAD')).toEqual({
            type: 'FORMFACTOR',
            value: 'foo',
        });
        expect(parseCommand('FORMFACTOR bar', 'PIPELINE_HEAD')).toEqual({
            type: 'FORMFACTOR',
            value: 'bar',
        });
    });

    it('should parse FORMFACTOR command in PIPELINE_TEMPLATE', () => {
        expect(parseCommand('FORMFACTOR foo', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FORMFACTOR',
            value: 'foo',
        });
        expect(parseCommand('FORMFACTOR bar', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FORMFACTOR',
            value: 'bar',
        });
    });

    it('should parse FORMFACTOR command in shortcut form', () => {
        expect(parseCommand('BP foo', 'PIPELINE_HEAD')).toEqual({
            type: 'FORMFACTOR',
            value: 'foo',
        });
        expect(parseCommand('BP bar', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FORMFACTOR',
            value: 'bar',
        });
    });

    it('should fail parsing FORMFACTOR command', () => {
        expect(() => parseCommand('FORMFACTOR', 'PIPELINE_HEAD')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('FORMFACTOR brr', 'PIPELINE_HEAD')).toThrowError(
            /FORMFACTOR value can not contain brr/i,
        );
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of formfactorCommandParser.examples) {
            // TODO: Remove places not using the command:
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
