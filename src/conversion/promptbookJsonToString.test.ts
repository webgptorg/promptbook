import { describe, expect, it } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { promptbookJsonToString } from './promptbookJsonToString';
import { promptbookStringToJson } from './promptbookStringToJson';
import { importPromptbook } from './validation/_importPromptbook';

describe('promptbookJsonToString', () => {
    const samplesDir = '../../samples/templates';

    const samples = readdirSync(join(__dirname, samplesDir), { withFileTypes: true, recursive: false })
        //                         <- Note: In production it is not good practice to use synchronous functions
        //                                  But this is only a test before the build, so it is okay
        .filter((dirent) => dirent.isFile())
        .filter(({ name }) => name.endsWith('.json'))
        .filter(({ name }) => !name.endsWith('.report.json'));

    for (const { name } of samples) {
        it(`convert json to string and back to same json ${name}`, () => {
            const promptbookJson = importPromptbook(join(samplesDir, name) as `${string}.ptbk.json`);
            expect(promptbookStringToJson(promptbookJsonToString(promptbookJson))).toEqual(promptbookJson);
        });
    }
});
