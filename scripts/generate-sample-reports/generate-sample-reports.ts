#!/usr/bin/env ts-node
// generate-sample-reports.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { join } from 'path';
import { executionReportJsonToString } from '../../src/types/execution-report/executionReportJsonToString';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const PROMPTBOOK_SAMPLES_DIR = join(process.cwd(), 'samples/pipelines');

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);
const { commit: isCommited } = program.opts();

generateSampleJsons({ isCommited })
    .catch((error) => {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generateSampleJsons({ isCommited }: { isCommited: boolean }) {
    console.info(`🏭📖  Generate reports .report.json -> .report.md`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    for (const reportFilePath of await glob(join(PROMPTBOOK_SAMPLES_DIR, '*.report.json').split('\\').join('/'))) {
        console.info(`📖  Generating Markdown report from ${reportFilePath}`);
        const executionReport = JSON.parse(await readFile(reportFilePath, 'utf-8'));
        const executionReportString = executionReportJsonToString(executionReport);
        const reportStringFilePath = reportFilePath.replace(/\.report\.json$/, '.report.md');
        await writeFile(reportStringFilePath, executionReportString, 'utf-8');
    }

    if (isCommited) {
        await commit([PROMPTBOOK_SAMPLES_DIR], `📖 Generate reports .report.json -> .report.md`);
    }

    console.info(`[ Done 📖  Generate reports .report.json -> .report.md]`);
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
