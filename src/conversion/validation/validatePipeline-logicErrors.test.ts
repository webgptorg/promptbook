import { describe, expect, it } from '@jest/globals';
import { pipelineStringToJson } from '../pipelineStringToJson';
import { importPipelineWithoutPreparation } from './_importPipeline';
import { validatePipeline } from './validatePipeline';

describe('validatePipeline', () => {
    it('should fail on using parameter that is not defined', () => {
        expect(async () => {
            const pipelineString = importPipelineWithoutPreparation('errors/logic/undefined-parameter.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/Can not resolve some parameters/i);
    });

    it('should fail on creating parameter that is then not used', () => {
        expect(async () => {
            const pipelineString = importPipelineWithoutPreparation('errors/logic/unused-parameter.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/Parameter \{name\} is created but not used/i);
    });

    it('should fail when picked the incompativble combination of model variant and name', () => {
        expect(async () => {
            const pipelineString = importPipelineWithoutPreparation('errors/logic/model-mismatch.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/Unknown model key/i);
    });

    it('should fail when expecting maximally 0 words', () => {
        expect(async () => {
            const pipelineString = importPipelineWithoutPreparation('errors/logic/wrong-expectations.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/Max expectation of words must be positive/i);
    });

    it('should fail when there is joker but no expectations', () => {
        expect(async () => {
            const pipelineString = importPipelineWithoutPreparation('errors/logic/joker-without-expectations.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/Joker parameters are used for \{name\} but no expectations are defined/i);
    });

    it('should fail on circular dependencies', () => {
        expect(async () => {
            const pipelineString = importPipelineWithoutPreparation('errors/logic/circular-parameters-simple.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/circular dependencies/i);

        expect(async () => {
            const pipelineString = importPipelineWithoutPreparation(
                'errors/logic/circular-parameters-advanced.ptbk.md',
            );
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/circular dependencies/i);
    });

    /*
    TODO: !!!
    it('should fail when provided sample dont passes the expectations', () => {
        expect(async () => {
            const pipelineString = importPipeline('errors/logic/sample-dont-pass-expectations.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/xxxxxx/i);
    });
    */

    /*
    TODO: !!!
    it('should fail when there is unused parameter', () => {
        expect(async () => {
            const pipelineString = importPipeline('errors/logic/unused-parameter.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/xxxxxx/i);
    });
    */

    /*
    TODO: !!!
    it('should fail when there is void knowledge', () => {
        expect(async () => {
            const pipelineString = importPipeline('errors/logic/void-knowledge.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/xxxxxx/i);
    });
    */

    /*
    TODO: !!!
    it('should fail when there is wrong expectations', () => {
        expect(async () => {
            const pipelineString = importPipeline('errors/logic/wrong-expectations.ptbk.md');
            const pipelineJson = await pipelineStringToJson(pipelineString);
            validatePipeline(pipelineJson);
        }).rejects.toThrowError(/xxxxxx/i);
    });
    */
});

/**
 * TODO: Include automatically all samples from logic errors folder (same with syntax errors)
 */
