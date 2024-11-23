import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { sectionCommandParser } from './sectionCommandParser';

describe('how SECTION command in .book.md files works', () => {
    it('should parse SECTION command in recommended form', () => {
        expect(parseCommand('PROMPT SECTION', 'PIPELINE_TASK')).toEqual({
            type: 'SECTION',
            taskType: 'PROMPT_SECTION',
        });

        // Note: No need to test all types, because it is tested from `sectionCommandParser.examples`
    });

    it('should work with deprecated EXECUTE command', () => {
        expect(parseCommand('EXECUTE Prompt block', 'PIPELINE_TASK')).toEqual({
            type: 'SECTION',
            taskType: 'PROMPT_SECTION',
        });
        expect(parseCommand('EXECUTE simple block', 'PIPELINE_TASK')).toEqual({
            type: 'SECTION',
            taskType: 'SIMPLE_SECTION',
        });
        expect(parseCommand('EXECUTE script', 'PIPELINE_TASK')).toEqual({
            type: 'SECTION',
            taskType: 'SCRIPT_SECTION',
        });
        expect(parseCommand('EXECUTE dialog', 'PIPELINE_TASK')).toEqual({
            type: 'SECTION',
            taskType: 'DIALOG_SECTION',
        });
    });

    it('should fail parsing SECTION command', () => {
        expect(() => parseCommand('template fooo', 'PIPELINE_TASK')).toThrowError(/Unknown template type/i);
        expect(() => parseCommand('template script prompt template', 'PIPELINE_TASK')).toThrowError(
            /Unknown template type/i,
        );
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of sectionCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TASK')).not.toThrowError();
        }
    });
});
