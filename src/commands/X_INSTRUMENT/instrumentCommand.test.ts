import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { instrumentCommandParser } from './instrumentCommandParser';

describe('how INSTRUMENT command in .ptbk.md files works', () => {
    it('should parse INSTRUMENT command in PIPELINE_HEAD', () => {
        expect(parseCommand('INSTRUMENT', 'PIPELINE_HEAD')).toEqual({
            type: 'INSTRUMENT',
        });
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of instrumentCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
