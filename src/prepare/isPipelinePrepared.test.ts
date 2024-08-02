import { describe, expect, it } from '@jest/globals';
import { pipelineStringToJsonSync } from '../conversion/pipelineStringToJsonSync';
import { importPipelineJson, importPipelineWithoutPreparation } from '../conversion/validation/_importPipeline';
import { isPipelinePrepared } from './isPipelinePrepared';
import { unpreparePipeline } from './unpreparePipeline';

describe('how isPipelinePrepared works', () => {
    it('should tell that pipeline is prepared', () => {
        expect(isPipelinePrepared(importPipelineJson('25-simple-knowledge.ptbk.json'))).toBe(true);
        expect(isPipelinePrepared(importPipelineJson('01-simple.ptbk.json'))).toBe(true);
    });

    it('should tell that simple pipeline is always prepared', () => {
        expect(isPipelinePrepared(unpreparePipeline(importPipelineJson('01-simple.ptbk.json')))).toBe(true);
        expect(
            isPipelinePrepared(pipelineStringToJsonSync(importPipelineWithoutPreparation('01-simple.ptbk.md'))),
        ).toBe(true);
    });

    it('should tell that pipeline is NOT prepared', () => {
        expect(isPipelinePrepared(unpreparePipeline(importPipelineJson('25-simple-knowledge.ptbk.json')))).toBe(false);
        expect(
            isPipelinePrepared(
                pipelineStringToJsonSync(importPipelineWithoutPreparation('25-simple-knowledge.ptbk.md')),
            ),
        ).toBe(false);
    });
});
