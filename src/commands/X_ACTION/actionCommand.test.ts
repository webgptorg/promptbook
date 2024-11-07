import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { actionCommandParser } from './actionCommandParser';

describe('how ACTION command in .ptbk.md files works', () => {
    it('should parse ACTION command in PIPELINE_HEAD', () => {
        expect(parseCommand('ACTION', 'PIPELINE_HEAD')).toEqual({
            type: 'ACTION',
        });
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of actionCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
