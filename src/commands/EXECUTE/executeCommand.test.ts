import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { executeCommandParser } from './executeCommandParser';

describe('how EXECUTE command in .ptbk.md files works', () => {
    it('should parse EXECUTE command', () => {
        expect(parseCommand('execute prompt template', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute simple template', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'SIMPLE_TEMPLATE',
        });
        expect(parseCommand('execute script', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'SCRIPT',
        });
        expect(parseCommand('execute prompt dialog', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_DIALOG',
        });
        expect(parseCommand('  execute    prompt         template', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute PROMPT_TEMPLATE', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute `prompt template`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
    });

    it('should fail parsing EXECUTE command', () => {
        expect(() => parseCommand('execute fooo', 'PIPELINE_TEMPLATE')).toThrowError(/Unknown execution type/i);
        expect(() => parseCommand('execute script prompt template', 'PIPELINE_TEMPLATE')).toThrowError(
            /Unknown execution type/i,
        );
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of executeCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
