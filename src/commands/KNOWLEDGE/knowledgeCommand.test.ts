import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { knowledgeCommandParser } from './knowledgeCommandParser';

describe('how KNOWLEDGE command in .ptbk.md files works', () => {
    it('should parse KNOWLEDGE command', () => {
        expect(parseCommand('KNOWLEDGE https://www.pavolhejny.com/')).toEqual({
            type: 'KNOWLEDGE',
            source: 'https://www.pavolhejny.com/',
        });
        expect(parseCommand('KNOWLEDGE ./hejny-cv.pdf')).toEqual({
            type: 'KNOWLEDGE',
            value: './hejny-cv.pdf',
        });
    });

    it('should fail parsing KNOWLEDGE command', () => {
        expect(() => parseCommand('KNOWLEDGE')).toThrowError(/requires exactly one argument/i);
        expect(() => parseCommand('KNOWLEDGE brr')).toThrowError(/Source not valid/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of knowledgeCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
