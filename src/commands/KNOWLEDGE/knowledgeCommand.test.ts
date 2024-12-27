import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { knowledgeCommandParser } from './knowledgeCommandParser';

describe('how KNOWLEDGE command in .book.md files works', () => {
    it('should parse KNOWLEDGE command', () => {
        expect(parseCommand('KNOWLEDGE https://www.pavolhejny.com/', 'PIPELINE_HEAD')).toEqual({
            type: 'KNOWLEDGE',
            sourceContent: 'https://www.pavolhejny.com/',
        });
        expect(parseCommand('KNOWLEDGE ./hejny-cv.pdf', 'PIPELINE_HEAD')).toEqual({
            //                          <- TODO: [😿] Allow ONLY files scoped in the (sub)directory NOT ../ and test it
            type: 'KNOWLEDGE',
            sourceContent: './hejny-cv.pdf',
        });
    });

    it('should fail parsing KNOWLEDGE command', () => {
        expect(() => parseCommand('KNOWLEDGE', 'PIPELINE_HEAD')).toThrowError(/Source is not defined/i);
        expect(() => parseCommand('KNOWLEDGE brr', 'PIPELINE_HEAD')).toThrowError(/Source not valid/i);
        expect(() => parseCommand('KNOWLEDGE http://www.pavolhejny.com/', 'PIPELINE_HEAD')).toThrowError(
            /Source is not secure/i,
        );
        expect(() => parseCommand('KNOWLEDGE ../hejny-cv.pdf', 'PIPELINE_HEAD')).toThrowError(
            /Source cannot be outside .* folder/i,
        );
        expect(() => parseCommand('KNOWLEDGE /hejny-cv.pdf', 'PIPELINE_HEAD')).toThrowError(
            /Source cannot be outside .* folder/i,
        );
        expect(() => parseCommand('KNOWLEDGE /etc/system-folder/hejny-cv.pdf', 'PIPELINE_HEAD')).toThrowError(
            /Source cannot be outside .* folder/i,
        );
        expect(() => parseCommand('KNOWLEDGE C:/hejny-cv.pdf', 'PIPELINE_HEAD')).toThrowError(
            /Source cannot be outside .* folder/i,
        );
        expect(() => parseCommand('KNOWLEDGE C://hejny-cv.pdf', 'PIPELINE_HEAD')).toThrowError(
            /Source cannot be outside .* folder/i,
        );
        expect(() => parseCommand('KNOWLEDGE C:\\hejny-cv.pdf', 'PIPELINE_HEAD')).toThrowError(
            /Source cannot be outside .* folder/i,
        );
        expect(() => parseCommand('KNOWLEDGE C:\\\\hejny-cv.pdf', 'PIPELINE_HEAD')).toThrowError(
            /Source cannot be outside .* folder/i,
        );
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of knowledgeCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
        }
    });
});
