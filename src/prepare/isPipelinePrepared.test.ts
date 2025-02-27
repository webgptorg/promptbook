import { describe, expect, it } from '@jest/globals';
import { parsePipeline } from '../conversion/parsePipeline';
import { importPipelineJson } from '../conversion/validation/_importPipeline';
import { importPipelineWithoutPreparation } from '../conversion/validation/_importPipeline';
import { isPipelinePrepared } from './isPipelinePrepared';
import { unpreparePipeline } from './unpreparePipeline';

describe('how isPipelinePrepared works', () => {
    it('should tell that pipeline is prepared', async () => {
        expect(isPipelinePrepared(await importPipelineJson('25-simple-knowledge.bookc'))).toBe(true);
        expect(isPipelinePrepared(await importPipelineJson('01-simple.bookc'))).toBe(true);
    });

    it('should tell that simple pipeline is always prepared', async () => {
        expect(isPipelinePrepared(unpreparePipeline(await importPipelineJson('01-simple.bookc')))).toBe(true);
        expect(isPipelinePrepared(parsePipeline(await importPipelineWithoutPreparation('01-simple.book')))).toBe(true);
        // Note: [🍫]
    });

    it('should tell that pipeline is NOT prepared', async () => {
        expect(isPipelinePrepared(unpreparePipeline(await importPipelineJson('25-simple-knowledge.bookc')))).toBe(
            false,
        );
        expect(
            isPipelinePrepared(parsePipeline(await importPipelineWithoutPreparation('25-simple-knowledge.book'))),
        ).toBe(false);
    });
});
