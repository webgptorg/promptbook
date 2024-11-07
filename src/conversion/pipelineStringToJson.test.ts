import { describe, expect, it } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pipelineStringToJson } from './pipelineStringToJson';
import { importPipelineWithoutPreparation } from './validation/_importPipeline';

describe('pipelineStringToJson', () => {
    const examplesDir = '../../examples/pipelines'; // <- TODO: [🚏] DRY, to config

    const examples = readdirSync(join(__dirname, examplesDir), { withFileTypes: true, recursive: false })
        //                         <- Note: In production it is not good practice to use synchronous functions
        //                                  But this is only a test before the build, so it is okay
        .filter((dirent) => dirent.isFile())
        .filter(({ name }) => name.endsWith('.ptbk.md'));

    for (const { name } of examples) {
        it(`should parse ${name}`, () =>
            expect(
                pipelineStringToJson(importPipelineWithoutPreparation(name as `${string}.ptbk.md`)),
            ).resolves.toEqual(
                importPipelineWithoutPreparation(
                    join(examplesDir, name).replace('.ptbk.md', '.ptbk.json') as `${string}.ptbk.json`,
                ),
            ));
    }
});
