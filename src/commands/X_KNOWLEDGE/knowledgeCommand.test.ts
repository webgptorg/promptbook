import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { knowledgeCommandParser } from './knowledgeCommandParser';

describe('how KNOWLEDGE command in .ptbk.md files works', () => {
    it('should parse KNOWLEDGE command', () => {
        expect(parseCommand('KNOWLEDGE foo')).toEqual({
            type: 'KNOWLEDGE',
            value: 'foo',
        });
        expect(parseCommand('KNOWLEDGE bar')).toEqual({
            type: 'KNOWLEDGE',
            value: 'bar',
        });
    });

    it('should parse KNOWLEDGE command in shortcut form', () => {
        expect(parseCommand('BP foo')).toEqual({
            type: 'KNOWLEDGE',
            value: 'foo',
        });
        expect(parseCommand('BP bar')).toEqual({
            type: 'KNOWLEDGE',
            value: 'bar',
        });
    });

    it('should fail parsing KNOWLEDGE command', () => {
        expect(() => parseCommand('KNOWLEDGE')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('KNOWLEDGE brr')).toThrowError(/KNOWLEDGE value can not contain brr/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of knowledgeCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
