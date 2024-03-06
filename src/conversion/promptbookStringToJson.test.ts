import { describe, expect, it } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { importPtbk } from './_importPtbk';
import { promptbookStringToJson } from './promptbookStringToJson';

describe('promptbookStringToJson', () => {
    const samplesDir = '../../samples/templates';

    console.log('join(__dirname, samplesDir)', join(__dirname, samplesDir));

    const samples = readdirSync(join(__dirname, samplesDir), { withFileTypes: true, recursive: false })
        //                         <- Note: In production it is not good practice to use synchronous functions
        //                                  But this is only a test before the build, so it is okay
        .filter((dirent) => dirent.isFile())
        .filter(({ name }) => name.endsWith('.md'))
        .filter(({ name }) => !name.endsWith('.report.md'));

    for (const { name } of samples) {
        it(`should parse ${name}`, () => {
            expect(promptbookStringToJson(importPtbk(join(samplesDir, name) as `${string}.ptbk.md`))).toEqual(
                importPtbk(join(samplesDir, name).replace('.ptbk.md', '.ptbk.json') as `${string}.ptbk.json`),
            );
        });
    }
});
