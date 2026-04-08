#!/usr/bin/env ts-node
// generate-example-reports.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import { basename, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { executionReportJsonToString } from '../../src/types/execution-report/executionReportJsonToString';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: generate-example-reports.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../..')}
            `),
        ),
    );
    process.exit(1);
}

/**
 * Constant for promptbook examples dir.
 */
const PROMPTBOOK_EXAMPLES_DIR = join(process.cwd(), 'examples/pipelines');

/**
 * Constant for program.
 */
const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);
/**
 * Constant for { commit: is commited }.
 */
const { commit: isCommited } = program.opts();

generateExampleJsons({ isCommited })
    .catch((error) => {
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Generates example jsons.
 */
async function generateExampleJsons({ isCommited }: { isCommited: boolean }) {
    console.info(`🏭📖  Generate reports .report.json -> .report.md`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    for (const reportFilePath of await glob(join(PROMPTBOOK_EXAMPLES_DIR, '*.report.json').split('\\').join('/'))) {
        console.info(`📖  Generating Markdown report from ${reportFilePath}`);
        const executionReport = JSON.parse(await readFile(reportFilePath, 'utf-8'));
        const executionReportString = executionReportJsonToString(executionReport);
        const reportStringFilePath = reportFilePath.replace(/\.report\.json$/, '.report.md');
        await writeFile(reportStringFilePath, executionReportString, 'utf-8');
    }

    if (isCommited) {
        await commit([PROMPTBOOK_EXAMPLES_DIR], `📖 Generate reports .report.json -> .report.md`);
    }

    console.info(`[ Done 📖  Generate reports .report.json -> .report.md]`);
}

// Note: [⚫] Code for repository script [generate-example-reports](scripts/generate-example-reports/generate-example-reports.ts) should never be published in any package
