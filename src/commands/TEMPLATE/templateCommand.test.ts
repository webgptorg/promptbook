import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { templateCommandParser } from './templateCommandParser';

describe('how TEMPLATE command in .ptbk.md files works', () => {
    it('should parse TEMPLATE command in recommended form', () => {
        expect(parseCommand('PROMPT TEMPLATE', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'TEMPLATE',
            templateType: 'PROMPT_TEMPLATE',
        });

        // Note: No need to test all types, because it is tested from `templateCommandParser.examples`
    });

    it('should work with deprecated EXECUTE command', () => {
        expect(parseCommand('EXECUTE Prompt block', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'TEMPLATE',
            templateType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('EXECUTE simple block', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'TEMPLATE',
            templateType: 'SIMPLE_TEMPLATE',
        });
        expect(parseCommand('EXECUTE script', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'TEMPLATE',
            templateType: 'SCRIPT_TEMPLATE',
        });
        expect(parseCommand('EXECUTE dialog', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'TEMPLATE',
            templateType: 'DIALOG_TEMPLATE',
        });
    });

    it('should fail parsing TEMPLATE command', () => {
        expect(() => parseCommand('template fooo', 'PIPELINE_TEMPLATE')).toThrowError(/Unknown template type/i);
        expect(() => parseCommand('template script prompt template', 'PIPELINE_TEMPLATE')).toThrowError(
            /Unknown template type/i,
        );
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of templateCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
