#!/usr/bin/env ts-node

/*
Note: [🔁] In your app you will be importing '@promptbook/core' instead of '../../../src/_packages/core.index.index',...
*/

import colors from 'colors';
import * as dotenv from 'dotenv';
import { writeFile } from 'fs/promises';
import { forTime } from 'waitasecond';
import {
    createPipelineExecutor,
    executionReportJsonToString,
    stringifyPipelineJson,
    usageToHuman,
} from '../../../src/_packages/core.index';
import { $provideExecutionToolsForNode, createCollectionFromDirectory } from '../../../src/_packages/node.index';

import '../../../src/_packages/anthropic-claude.index';
import '../../../src/_packages/azure-openai.index';
import '../../../src/_packages/openai.index';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main()
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function main() {
    console.info(colors.bgWhite('⚪ Testing basic capabilities of Promptbook'));

    const collection = await createCollectionFromDirectory(
        './examples/pipelines/',
        {},
        {
            isVerbose: true,
            isRecursive: false,
            isCrashedOnError: true,
        },
    );

    // TODO: Allow user to pick pipeline
    // > const pipelineUrls = await collection.listPipelines();
    // @see https://nodejs.org/en/learn/command-line/accept-input-from-the-command-line-in-nodejs

    const pipeline = await collection.getPipelineByUrl(
        // `https://promptbook.studio/examples/foreach-list.book.md`,
        // `https://promptbook.studio/examples/foreach-csv.book.md`,
        `https://promptbook.studio/examples/simple-knowledge.book.md`,
        // `https://promptbook.studio/examples/simple.book.md`,
        // `https://promptbook.studio/examples/language-capabilities.book.md`,
    );

    if (!pipeline.sourceFile) {
        throw new Error(`Pipeline has no sourceFile`);
    }

    await forTime(100);

    const pipelineExecutor = createPipelineExecutor({ pipeline, tools: await $provideExecutionToolsForNode() });

    const inputParameters = {
        /*/
        // https://promptbook.studio/examples/foreach-list.book.md
        customers: spaceTrim(`
            Paul
            George
            Kate
        `),
        /**/
        /*/
        // https://promptbook.studio/examples/foreach-csv.book.md
        customers: await readFile('./examples/pipelines/85-foreach.csv', 'utf-8'),
        /**/
        /**/
        // https://promptbook.studio/examples/simple-knowledge.book.md
        eventTitle: 'LinkedIn',
        eventDescription: 'Professional CV',
        rules: 'Write best text for corporate CV',
        /**/
    };
    const { isSuccessful, errors, warnings, outputParameters, executionReport, usage } = await pipelineExecutor(
        inputParameters,
        (progress) => {
            console.info(progress.isDone ? '☑' : '☐', progress);
        },
    );

    console.info('outputParameters', outputParameters);

    await writeFile(
        pipeline.sourceFile.split('.book.md').join('.report.md').split('.book.json').join('.report.json'),
        //                  <- TODO: [0] More elegant way to replace extension
        stringifyPipelineJson(executionReport),
        'utf-8',
    );

    const executionReportString = executionReportJsonToString(executionReport);

    await writeFile(
        pipeline.sourceFile.split('.book.md').join('.report.md').split('.book.json').join('.report.md'),
        //                  <- TODO: [0] More elegant way to replace extension
        executionReportString,
        'utf-8',
    );

    for (const warning of warnings) {
        console.error(colors.bgYellow(warning.name /* <- 11:11 */));
        console.error(colors.yellow(warning.stack || warning.message));
    }

    for (const error of errors) {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
    }

    // console.info(usage);
    console.info(colors.cyan(usageToHuman(usage /* <- TODO: [🌳] Compare with `llmTools.getTotalUsage()` */)));

    for (const [key, value] of Object.entries(outputParameters)) {
        console.info(colors.bgGreen(key), colors.green(value));
    }

    process.exit(isSuccessful ? 0 : 1);
}

/**
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PipelineCollection.fromDirectory ([📂] directory vs folder)
 * TODO: [🧠] Maybe make .js version of simple-script
 * TODO: [🧙‍♂️] Make example with Wizzard supersimple-script.ts
 */
