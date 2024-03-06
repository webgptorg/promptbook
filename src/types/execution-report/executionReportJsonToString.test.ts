import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { executionReportJsonToString } from './executionReportJsonToString';

describe('executionReportJsonToString.test', () => {
    const samplesDir = '../../../samples/templates';
    const samples = readdirSync(join(__dirname, samplesDir), { withFileTypes: true, recursive: false })
        //                         <- Note: In production it is not good practice to use synchronous functions
        //                                  But this is only a test before the build, so it is okay
        .filter((dirent) => dirent.isFile())
        .filter(({ name }) => name.endsWith('.report.json'));

    for (const { name } of samples) {
        it(`should generate report for ${name}`, () => {
            expect(
                executionReportJsonToString(
                    JSON.parse(
                        readFileSync(join(__dirname, samplesDir, name), 'utf-8'),
                        //          <- Note: In production it is not good practice to use synchronous functions
                        //                   But this is only a test before the build, so it is okay
                    ),
                ),
            ).toEqual(readFileSync(join(__dirname, samplesDir, name).replace('.report.json', '.report.md'), 'utf-8'));
        });
    }
});
