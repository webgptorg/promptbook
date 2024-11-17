import { describe, expect, it } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { PipelineLogicError } from '../../errors/PipelineLogicError';
import { pipelineStringToJson } from '../pipelineStringToJson';
import { importPipelineWithoutPreparation } from './_importPipeline';
import { validatePipeline } from './validatePipeline';

describe('validatePipeline with logic errors', () => {
    const examplesDir = '../../../examples/pipelines/'; // <- TODO: [🚏] DRY, to config
    const examples = readdirSync(join(__dirname, examplesDir, 'errors/logic'), {
        withFileTypes: true,
        recursive: false,
    })
        //                         <- Note: In production it is not good practice to use synchronous functions
        //                                  But this is only a test before the build, so it is okay
        .filter((dirent) => dirent.isFile())
        .filter(({ name }) => name.endsWith('.book.md'));

    for (const { name } of examples) {
        it(`should validate ${name} logic`, () => {
            expect(async () => {
                const pipelineString = importPipelineWithoutPreparation(
                    ('errors/logic/' + name) as `${string}.book.md`,
                );
                const pipelineJson = await pipelineStringToJson(pipelineString);
                validatePipeline(pipelineJson);

                console.error('Pipeline should have logic error BUT it does not:\n', name);
            }).rejects.toThrowError(PipelineLogicError);
        });
    }
});

/**
 * TODO: [🚏] DRY
 */
