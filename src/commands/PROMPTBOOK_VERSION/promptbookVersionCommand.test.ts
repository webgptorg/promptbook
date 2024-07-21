import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { promptbookVersionCommandParser } from './promptbookVersionCommandParser';

describe('how PROMPTBOOK_VERSION command in .ptbk.md files works', () => {
    it('should parse PROMPTBOOK_VERSION command', () => {
        expect(parseCommand('promptbook version 1.0.0', 'PIPELINE_HEAD')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion: '1.0.0',
        });
        expect(parseCommand('PTBK version 1.0.0', 'PIPELINE_HEAD')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion: '1.0.0',
        });

        expect(parseCommand('PTBK version 1.0.0', 'PIPELINE_HEAD')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion: '1.0.0',
        });
        expect(parseCommand('PROMPTBOOK version 1.0.0', 'PIPELINE_HEAD')).toEqual({
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion: '1.0.0',
        });
    });

    it('should fail parsing PROMPTBOOK_VERSION command', () => {
        expect(() => parseCommand('PROMPTBOOK version', 'PIPELINE_HEAD')).toThrowError(
            /Invalid PROMPTBOOK_VERSION command/i,
        );
        expect(() => parseCommand('PROMPTBOOK version   ', 'PIPELINE_HEAD')).toThrowError(
            /Invalid PROMPTBOOK_VERSION command/i,
        );
        // TODO: Also test invalid version in PROMPTBOOK_VERSION command
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of promptbookVersionCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
        }
    });
});
