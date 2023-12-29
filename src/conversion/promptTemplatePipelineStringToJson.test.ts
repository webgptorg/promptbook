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
        ).toEqual(importPtp('../../samples/templates/10-single.ptbk.json'));
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

    it('should fail on invalid language block', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(
                importPtp('../../samples/templates/errors/syntax/invalid-language.ptbk.md'),
            ),
        ).toThrowError(/coffeescript is not supported/i);
    });
    it('should fail on missing block on prompt template', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(
                importPtp('../../samples/templates/errors/syntax/missing-block.ptbk.md'),
            ),
        ).toThrowError(/There should be exactly one code block in the markdown/i);
    });
    it('should fail on missing return declaration', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(
                importPtp('../../samples/templates/errors/syntax/missing-return-1.ptbk.md'),
            ),
        ).toThrowError(/Invalid template/i);
    });
    it('should fail on invalid return declaration', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(
                importPtp('../../samples/templates/errors/syntax/missing-return-2.ptbk.md'),
            ),
        ).toThrowError(/Unknown command/i);
    });
    it('should fail on multiple prompts in one prompt template', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(
                importPtp('../../samples/templates/errors/syntax/multiple-blocks.ptbk.md'),
            ),
        ).toThrowError(/There should be exactly one code block in the markdown/i);
    });
    it('should fail on lack of structure ', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(importPtp('../../samples/templates/errors/syntax/no-heading.ptbk.md')),
        ).toThrowError(/The markdown file must have exactly one top-level section/i);
    });

    it('should fail on parameters collision', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(
                importPtp('../../samples/templates/errors/syntax/parameters-collision.ptbk.md'),
            ),
        ).toThrowError(/Parameter \{word\} is defined multiple times/i);
    });
});


/**
 * TODO: [💥] Some system to automatically generate tests for all the templates in the folder
 */