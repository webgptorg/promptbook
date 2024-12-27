import { describe, expect, it } from '@jest/globals';
import { BOOK_LANGUAGE_VERSION } from '../../version';
import { parseCommand } from '../_common/parseCommand';
import { bookVersionCommandParser } from './bookVersionCommandParser';

describe('how BOOK_VERSION command in .book.md files works', () => {
    it('should parse BOOK_VERSION command', () => {
        expect(parseCommand('promptbook version 0.62.0', 'PIPELINE_HEAD')).toEqual({
            type: 'BOOK_VERSION',
            bookVersion: '0.62.0',
        });
        expect(parseCommand('PTBK version 0.62.0', 'PIPELINE_HEAD')).toEqual({
            type: 'BOOK_VERSION',
            bookVersion: '0.62.0',
        });

        expect(parseCommand('PTBK version 0.62.0', 'PIPELINE_HEAD')).toEqual({
            type: 'BOOK_VERSION',
            bookVersion: '0.62.0',
        });
        expect(parseCommand(`PROMPTBOOK version ${BOOK_LANGUAGE_VERSION}`, 'PIPELINE_HEAD')).toEqual({
            type: 'BOOK_VERSION',
            bookVersion: BOOK_LANGUAGE_VERSION,
        });
    });

    it('should fail parsing BOOK_VERSION command', () => {
        expect(() => parseCommand('PROMPTBOOK version', 'PIPELINE_HEAD')).toThrowError(/Version is required/i);
        expect(() => parseCommand('PROMPTBOOK version   ', 'PIPELINE_HEAD')).toThrowError(/Version is required/i);
        expect(() => parseCommand('PROMPTBOOK version 0.25.0 0.26.0', 'PIPELINE_HEAD')).toThrowError(
            /Can not have more than one Promptbook version/i,
        );
        expect(() => parseCommand('PROMPTBOOK version 3.0.0', 'PIPELINE_HEAD')).toThrowError(
            /Invalid Promptbook version/i,
        );
    });

    it('should fail to prevent mismatch between version of pipeline and promptbook', () => {
        expect(() => parseCommand('VERSION 0.62.0', 'PIPELINE_HEAD')).toThrowError(/Malformed or unknown command/i);
        expect(() => parseCommand('V 0.62.0', 'PIPELINE_HEAD')).toThrowError(/Malformed or unknown command/i);
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of bookVersionCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
        }
    });
});
