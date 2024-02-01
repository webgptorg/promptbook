import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { executionReportJsonToString } from './executionReportJsonToString';

describe('executionReportJsonToString.test', () => {
    it('should generate 50-advanced.report.md', () => {
        expect(
            executionReportJsonToString(
                JSON.parse(
                    readFileSync(join(__dirname, '../../../samples/templates/50-advanced.report.json'), 'utf-8'),
                    //          <- Note: In production it is not good practice to use synchronous functions
                    //                   But this is only a test before the build, so it is okay
                ),
            ),
        ).toEqual(readFileSync(join(__dirname, '../../../samples/templates/50-advanced.report.md'), 'utf-8'));
    });
});

/**
 * TODO: [💥] Some system to automatically generate tests for all the templates in the folder
 */
