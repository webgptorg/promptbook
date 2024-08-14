import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { blockCommandParser } from './blockCommandParser';

describe('how BLOCK command in .ptbk.md files works', () => {
    it('should parse BLOCK command', () => {
        expect(parseCommand('block prompt template', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('block simple template', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'SIMPLE_TEMPLATE',
        });
        expect(parseCommand('block script', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'SCRIPT',
        });
        expect(parseCommand('block prompt dialog', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'PROMPT_DIALOG',
        });
        expect(parseCommand('  block    prompt         template', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('block PROMPT_TEMPLATE', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('block `prompt template`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'PROMPT_TEMPLATE',
        });

        // <- [🅱]
    });

    it('should work with deprecated EXECUTE command', () => {
        expect(parseCommand('EXECUTE Prompt template', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('EXECUTE simple template', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'SIMPLE_TEMPLATE',
        });
        expect(parseCommand('EXECUTE script', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'SCRIPT',
        });
        expect(parseCommand('EXECUTE prompt dialog', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'BLOCK',
            blockType: 'PROMPT_DIALOG',
        });
    });

    it('should fail parsing BLOCK command', () => {
        expect(() => parseCommand('block fooo', 'PIPELINE_TEMPLATE')).toThrowError(/Unknown block type/i);
        expect(() => parseCommand('block script prompt template', 'PIPELINE_TEMPLATE')).toThrowError(
            /Unknown block type/i,
        );
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of blockCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
