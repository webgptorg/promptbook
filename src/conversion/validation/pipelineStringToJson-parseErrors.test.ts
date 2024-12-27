import { describe, expect, it } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { ParseError } from '../../errors/ParseError';
import { pipelineStringToJson } from '../pipelineStringToJson';
import { importPipelineWithoutPreparation } from './_importPipeline';
import { validatePipeline } from './validatePipeline';

describe('validatePipeline with parse errors', () => {
    const examplesDir = '../../../examples/pipelines/'; // <- TODO: [🚏] DRY, to config
    const examples = readdirSync(join(__dirname, examplesDir, 'errors/parse'), {
        withFileTypes: true,
        recursive: false,
    })
        //                         <- Note: In production it is not good practice to use synchronous functions
        //                                  But this is only a test before the build, so it is okay
        .filter((dirent) => dirent.isFile())
        .filter(({ name }) => name.endsWith('.book.md'));

    for (const { name } of examples) {
        it(`should parse ${name} parse`, () => {
            expect(async () => {
                const pipelineString = importPipelineWithoutPreparation(
                    ('errors/parse/' + name) as `${string}.book.md`,
                );
                const pipelineJson = await pipelineStringToJson(pipelineString);

                try {
                    validatePipeline(pipelineJson);
                    console.error('Pipeline should have ParseError error BUT it does not have any error:\n', name);
                } catch (error) {
                    if (!(error instanceof Error)) {
                        throw error;
                    }

                    console.error(`Pipeline should have ParseError error BUT it has ${error.name}:\n`, name);
                }
            }).rejects.toThrowError(ParseError);
        });
    }
});

/**
 * TODO: [🚏] DRY
 */
