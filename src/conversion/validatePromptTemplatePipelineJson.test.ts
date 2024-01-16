import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { importPtp } from './_importPtp';
import { promptTemplatePipelineStringToJson } from './promptTemplatePipelineStringToJson';
import { validatePromptTemplatePipelineJson } from './validatePromptTemplatePipelineJson';

describe('validatePromptTemplatePipelineJson', () => {
    it('should work in valid samples', () => {
        for (const path of [
            '../../samples/templates/00-simple.ptbk.md',
            '../../samples/templates/05-comment.ptbk.md',
            '../../samples/templates/10-single.ptbk.md',
            '../../samples/templates/20-two.ptbk.md',
            '../../samples/templates/30-escaping.ptbk.md',
            '../../samples/templates/50-advanced.ptbk.md',
            '../../samples/templates/60-json-mode.ptbk.md',
        ] as const) {
            expect(() => {
                try {
                    const ptbkString = importPtp(path);
                    const ptbJson = promptTemplatePipelineStringToJson(ptbkString);
                    validatePromptTemplatePipelineJson(ptbJson);
                } catch (error) {
                    if (!(error instanceof Error)) {
                        throw error;
                    }

                    throw new Error(
                        spaceTrim(
                            (block) => `

                                Error in ${path}:

                                ${block((error as Error).message)}

                            `,
                        ),
                    );
                }
            }).not.toThrowError();
        }
    });

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

/**
 * TODO: [💥] Some system to automatically generate tests for all the templates in the folder
 */
