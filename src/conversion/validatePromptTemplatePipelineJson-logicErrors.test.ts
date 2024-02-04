import { describe, expect, it } from '@jest/globals';
import { importPtp } from './_importPtp';
import { promptTemplatePipelineStringToJson } from './promptTemplatePipelineStringToJson';
import { validatePromptTemplatePipelineJson } from './validatePromptTemplatePipelineJson';

describe('validatePromptTemplatePipelineJson', () => {
    it('should fail on using parameter before defining', () => {
        expect(() => {
            const ptbkString = importPtp('../../samples/templates/errors/logic/parameter-used-before-defining.ptbk.md');
            const ptbJson = promptTemplatePipelineStringToJson(ptbkString);
            validatePromptTemplatePipelineJson(ptbJson);
        }).toThrowError(/Parameter \{word\} used before defined/i);
    });

    it('should fail when picked the incompativble combination of model variant and name', () => {
        expect(() => {
            const ptbkString = importPtp('../../samples/templates/errors/logic/model-mismatch.ptbk.md');
            const ptbJson = promptTemplatePipelineStringToJson(ptbkString);
            validatePromptTemplatePipelineJson(ptbJson);
        }).toThrowError(/Unknown model key/i);
    });
});
