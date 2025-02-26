import { describe, expect, it } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../compilePipeline';
import { importPipelineWithoutPreparation } from './_importPipeline';
import { validatePipeline } from './validatePipeline';

describe('validatePipeline with valid examples', () => {
    const examplesDir = '../../../examples/pipelines'; // <- TODO: [🚏] DRY, to config
    const examples = readdirSync(join(__dirname, examplesDir), { withFileTypes: true, recursive: false })
        //                         <- Note: In production it is not good practice to use synchronous functions
        //                                  But this is only a test before the build, so it is okay
        .filter((dirent) => dirent.isFile())
        .filter(({ name }) => name.endsWith('.book'));

    for (const { name } of examples) {
        it(`should validate ${name} syntax, parsing and logic`, () => {
            expect(
                (async () => {
                    try {
                        const pipelineString = importPipelineWithoutPreparation(name as `${string}.book`);
                        const pipelineJson = await compilePipeline(pipelineString);
                        validatePipeline(pipelineJson);
                    } catch (error) {
                        if (!(error instanceof Error)) {
                            throw error;
                        }

                        throw new Error(
                            spaceTrim(
                                (block) => `

                                Error in ${join(__dirname, examplesDir, name).split('\\').join('/')}:

                                ${block((error as Error).message)}

                            `,
                            ),
                        );
                    }
                })(),
            ).resolves.not.toThrowError();
        });
    }
});

/**
 * TODO: [🚏] DRY
 */
