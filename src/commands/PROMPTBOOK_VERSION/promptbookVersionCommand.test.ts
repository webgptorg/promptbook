import { describe, expect, it } from '@jest/globals';
import { PROMPTBOOK_VERSION } from '../../version';
import { parseCommand } from '../_common/parseCommand';
import { promptbookVersionCommandParser } from './promptbookVersionCommandParser';

describe('how PROMPTBOOK_VERSION command in .ptbk.md files works', () => {
    it('should parse PROMPTBOOK_VERSION command', () => {
        expect(parseCommand('promptbook version 0.62.0', 'PIPELINE_HEAD')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion: '0.62.0',
        });
        expect(parseCommand('PTBK version 0.62.0', 'PIPELINE_HEAD')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion: '0.62.0',
        });

        expect(parseCommand('PTBK version 0.62.0', 'PIPELINE_HEAD')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion: '0.62.0',
        });
        expect(parseCommand(`PROMPTBOOK version ${PROMPTBOOK_VERSION}`, 'PIPELINE_HEAD')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion: PROMPTBOOK_VERSION,
        });
    });

    it('should fail parsing PROMPTBOOK_VERSION command', () => {
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

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of promptbookVersionCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
        }
    });
});
