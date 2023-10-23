import { describe, expect, it } from '@jest/globals';
import { promptTemplatePipelineStringToJson } from './promptTemplatePipelineStringToJson';
import { importPtp } from './_importPtp';

describe('promptTemplatePipelineStringToJson', () => {
    it('should parse simple promptTemplatePipeline', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/00-simple.ptp.md'))).toEqual(
            importPtp('../../samples/00-simple.ptp.json'),
        );
    });

    it('should parse promptTemplatePipeline with comment', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/05-comment.ptp.md'))).toEqual(
            importPtp('../../samples/05-comment.ptp.json'),
        );
    });
    it('should parse promptTemplatePipeline with one template', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/10-single.ptp.md'))).toEqual(
            importPtp('../../samples/10-single.ptp.json'),
        );
    });
    it('should parse promptTemplatePipeline with two templates', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/20-two.ptp.md'))).toEqual(
            importPtp('../../samples/20-two.ptp.json'),
        );
    });

    it('should parse with escape characters', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/30-escaping.ptp.md'))).toEqual(
            importPtp('../../samples/30-escaping.ptp.json'),
        );
    });

    it('should parse promptTemplatePipeline with advanced structure', () => {
        expect(promptTemplatePipelineStringToJson(importPtp('../../samples/50-advanced.ptp.md'))).toEqual(
            importPtp('../../samples/50-advanced.ptp.json'),
        );
    });

    it('should fail on invalid language block', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(importPtp('../../samples/errors/syntax/invalid-language.ptp.md')),
        ).toThrowError(/coffeescript is not supported/i);
    });
    it('should fail on missing block on prompt template', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(importPtp('../../samples/errors/syntax/missing-block.ptp.md')),
        ).toThrowError(/There should be exactly one code block in the markdown/i);
    });
    it('should fail on missing return declaration', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(importPtp('../../samples/errors/syntax/missing-return-1.ptp.md')),
        ).toThrowError(/Invalid template/i);
    });
    it('should fail on invalid return declaration', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(importPtp('../../samples/errors/syntax/missing-return-2.ptp.md')),
        ).toThrowError(/Unknown command/i);
    });
    it('should fail on multiple prompts in one prompt template', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(importPtp('../../samples/errors/syntax/multiple-blocks.ptp.md')),
        ).toThrowError(/There should be exactly one code block in the markdown/i);
    });
    it('should fail on lack of structure ', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(importPtp('../../samples/errors/syntax/no-heading.ptp.md')),
        ).toThrowError(/The markdown file must have exactly one top-level section/i);
    });

    it('should fail on parameters collision', () => {
        expect(() =>
            promptTemplatePipelineStringToJson(importPtp('../../samples/errors/syntax/parameters-collision.ptp.md')),
        ).toThrowError(/Parameter \{word\} is defined multiple times/i);
    });
});
