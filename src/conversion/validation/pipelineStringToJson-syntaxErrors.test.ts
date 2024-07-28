import { describe, expect, it } from '@jest/globals';
import { pipelineStringToJson } from '../pipelineStringToJson';
import { importPipelineWithoutPreparation } from './_importPipeline';

describe('pipelineStringToJson', () => {
    it('should fail on invalid language block', () => {
        expect(
            async () =>
                await pipelineStringToJson(importPipelineWithoutPreparation('errors/syntax/invalid-language.ptbk.md')),
        ).rejects.toThrowError(/coffeescript is not supported/i);
    });

    it('should fail on missing block on prompt template', () => {
        expect(
            async () =>
                await pipelineStringToJson(importPipelineWithoutPreparation('errors/syntax/missing-block.ptbk.md')),
        ).rejects.toThrowError(/There should be exactly one code block in the markdown/i);
    });

    it('should fail on missing return declaration', () => {
        expect(
            async () =>
                await pipelineStringToJson(importPipelineWithoutPreparation('errors/syntax/missing-return-1.ptbk.md')),
        ).rejects.toThrowError(/Each section must end with ->/i);
    });

    it('should fail on invalid return declaration', () => {
        expect(
            async () =>
                await pipelineStringToJson(importPipelineWithoutPreparation('errors/syntax/missing-return-2.ptbk.md')),
        ).rejects.toThrowError(/Each section must end with ->/i);
    });

    it('should fail on multiple prompts in one prompt template', () => {
        expect(
            async () =>
                await pipelineStringToJson(importPipelineWithoutPreparation('errors/syntax/multiple-blocks.ptbk.md')),
        ).rejects.toThrowError(/There should be exactly one code block in the markdown/i);
    });

    it('should fail on parameters collision', () => {
        expect(
            async () =>
                await pipelineStringToJson(
                    importPipelineWithoutPreparation('errors/syntax/parameters-collision.ptbk.md'),
                ),
        ).rejects.toThrowError(/Parameter \{word\} is defined multiple times/i);
    });

    // TODO: !!! Missing LLM tools when processing knowledge
});
