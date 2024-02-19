import { describe, expect, it } from '@jest/globals';
import { importPtp } from './_importPtp';
import { promptTemplatePipelineStringToJson } from './promptTemplatePipelineStringToJson';
import { validatePromptTemplatePipelineJson } from './validatePromptTemplatePipelineJson';

describe('validatePromptTemplatePipelineJson', () => {
    it('should fail when parent ptp is not found', () => {
        expect(() => {
            const ptbkString = importPtp('../../samples/templates/errors/reference/parent-not-found.ptbk.md');
            const ptbJson = promptTemplatePipelineStringToJson(ptbkString);
            validatePromptTemplatePipelineJson(ptbJson);
        }).toThrowError(/Parent not found/i);
    });
});
