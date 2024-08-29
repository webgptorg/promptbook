import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { expectCommandParser } from './expectFormatCommandParser';

describe('how EXPECT_FORMATcommand in .ptbk.md files works', () => {
    it('should parse EXPECT_FORMAT command', () => {
        expect(parseCommand('Expect JSON', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_FORMAT',
            format: 'JSON',
        });

        // [🥤] - Test here relative and absolute schema reference
    });

    it('should fail parsing expect command', () => {
        expect(() => parseCommand('Expect 2x JSON', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid EXPECT_FORMAT command/i,
        );
        expect(() => parseCommand('Expect PNG', 'PIPELINE_TEMPLATE')).toThrowError(/Invalid EXPECT_FORMAT command/i);
        expect(() => parseCommand('EXPECT', 'PIPELINE_TEMPLATE')).toThrowError(/Invalid EXPECT_FORMAT command/i);
        expect(() => parseCommand('EXPECT brr', 'PIPELINE_TEMPLATE')).toThrowError(/Invalid EXPECT_FORMAT command/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of expectCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
