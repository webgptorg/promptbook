import { describe, expect, it } from '@jest/globals';
import { importPtp } from './_importPtp';
import { promptTemplatePipelineStringToJson } from './promptTemplatePipelineStringToJson';

describe('promptTemplatePipelineStringToJson', () => {
    it('should parse simple promptTemplatePipeline', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/templates/00-simple.ptbk.md'))).toEqual(
            importPtp('../../samples/templates/00-simple.ptbk.json'),
        );
    });

    it('should parse promptTemplatePipeline with comment', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/templates/05-comment.ptbk.md'))).toEqual(
            importPtp('../../samples/templates/05-comment.ptbk.json'),
        );
    });
    it('should parse promptTemplatePipeline with one template', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/templates/10-single.ptbk.md'))).toEqual(
            importPtp('../../samples/templates/10-single.ptbk.json'),
        );
    });

    it('should parse promptTemplatePipeline with picking the exact model', () => {
        expect(
            promptTemplatePipelineStringToJson(importPtp('../../samples/templates/11-picking-model.ptbk.md')),
        ).toEqual(importPtp('../../samples/templates/11-picking-model.ptbk.json'));
    });

    it('should parse promptTemplatePipeline with two templates', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/templates/20-two.ptbk.md'))).toEqual(
            importPtp('../../samples/templates/20-two.ptbk.json'),
        );
    });

    it('should parse with escape characters', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/templates/30-escaping.ptbk.md'))).toEqual(
            importPtp('../../samples/templates/30-escaping.ptbk.json'),
        );
    });

    it('should parse promptTemplatePipeline with advanced structure', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/templates/50-advanced.ptbk.md'))).toEqual(
            importPtp('../../samples/templates/50-advanced.ptbk.json'),
        );
    });

    it('should parse promptTemplatePipeline with json mode', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/templates/60-json-mode.ptbk.md'))).toEqual(
            importPtp('../../samples/templates/60-json-mode.ptbk.json'),
        );
    });
});

/**
 * TODO: [💥] Some system to automatically generate tests for all the templates in the folder
 */
