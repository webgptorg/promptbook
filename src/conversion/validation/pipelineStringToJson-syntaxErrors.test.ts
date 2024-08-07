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
        ).rejects.toThrowError(/There should be exactly 1 code block, found 0 code blocks/i);
    });

    it('should fail on missing return declaration', () => {
        expect(
            async () =>
                await pipelineStringToJson(importPipelineWithoutPreparation('errors/syntax/missing-return-1.ptbk.md')),
        ).rejects.toThrowError(/Template section must end with -> \{parameterName\}/i);
    });

    it('should fail on invalid return declaration', () => {
        expect(
            async () =>
                await pipelineStringToJson(importPipelineWithoutPreparation('errors/syntax/missing-return-2.ptbk.md')),
        ).rejects.toThrowError(/Template section must end with -> \{parameterName\}/i);
    });

    it('should fail on multiple prompts in one prompt template', () => {
        expect(
            async () =>
                await pipelineStringToJson(importPipelineWithoutPreparation('errors/syntax/multiple-blocks.ptbk.md')),
        ).rejects.toThrowError(/There should be exactly 1 code block, found 2 code blocks/i);
    });

    it('should fail on parameters collision', () => {
        expect(
            async () =>
                await pipelineStringToJson(
                    importPipelineWithoutPreparation('errors/syntax/parameters-collision.ptbk.md'),
                ),
        ).rejects.toThrowError(/Parameter \{word\} is defined multiple times/i);
    });

    // TODO: Maybe Test that error (or warning) is thrown when missing `llmTools` when processing knowledge in pipeline
    //       BUT probably not because if knoledge and personas are not prepared here, they will be prepared later in `createPipelineExecutor` (via `preparePipeline`)
});
