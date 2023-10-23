import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { promptTemplatePipelineStringToJson } from './promptTemplatePipelineStringToJson';
import { validatePromptTemplatePipelineJson } from './validatePromptTemplatePipelineJson';
import { importPtp } from './_importPtp';

describe('validatePromptTemplatePipelineJson', () => {
    it('should work in valid samples', () => {
        for (const path of [
            '../../samples/00-simple.ptp.md',
            '../../samples/05-comment.ptp.md',
            '../../samples/10-single.ptp.md',
            '../../samples/20-two.ptp.md',
            '../../samples/30-escaping.ptp.md',
            '../../samples/50-advanced.ptp.md',
        ] as const) {
            expect(() => {
                try {
                    const ptpString = importPtp(path);
                    const ptpJson = promptTemplatePipelineStringToJson(ptpString);
                    validatePromptTemplatePipelineJson(ptpJson);
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
            const ptpString = importPtp('../../samples/errors/logic/parameter-used-before-defining.ptp.md');
            const ptpJson = promptTemplatePipelineStringToJson(ptpString);
            validatePromptTemplatePipelineJson(ptpJson);
        }).toThrowError(/Parameter \{word\} used before defined/i);
    });
});
