import { describe, expect, it } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pipelineStringToJsonSync } from './pipelineStringToJsonSync';
import { importPipelineWithoutPreparation } from './validation/_importPipeline';

describe('pipelineStringToJsonSync', () => {
    const samplesDir = '../../samples/templates';

    const samples = readdirSync(join(__dirname, samplesDir), { withFileTypes: true, recursive: false })
        //                         <- Note: In production it is not good practice to use synchronous functions
        //                                  But this is only a test before the build, so it is okay
        .filter((dirent) => dirent.isFile())
        .filter(({ name }) => name.endsWith('.md'))
        .filter(({ name }) => !name.endsWith('.report.md'));

    for (const { name } of samples) {
        it(`should parse ${name}`, () =>
            expect(pipelineStringToJsonSync(importPipelineWithoutPreparation(name as `${string}.ptbk.md`))).toEqual(
                importPipelineWithoutPreparation(
                    join(samplesDir, name).replace('.ptbk.md', '.ptbk.json') as `${string}.ptbk.json`,
                ),
            ));
    }
});
