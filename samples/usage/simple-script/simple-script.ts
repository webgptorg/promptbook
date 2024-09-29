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
import { JavascriptExecutionTools } from '../../../src/_packages/execute-javascript.index';
import { createCollectionFromDirectory, createLlmToolsFromEnv } from '../../../src/_packages/node.index';

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

    const collection = await createCollectionFromDirectory('./samples/pipelines/', {
        llmTools: null,
        isVerbose: true,
        isRecursive: false,
        isCrashedOnError: true,
    });

    // TODO: Allow user to pick pipeline
    // > const pipelineUrls = await collection.listPipelines();
    // @see https://nodejs.org/en/learn/command-line/accept-input-from-the-command-line-in-nodejs

    const pipeline = await collection.getPipelineByUrl(
        //`https://promptbook.studio/samples/foreach-list.ptbk.md`,
        //`https://promptbook.studio/samples/foreach-csv.ptbk.md`,
        `https://promptbook.studio/samples/simple-knowledge.ptbk.md`,
        // `https://promptbook.studio/samples/simple.ptbk.md`,
        // `https://promptbook.studio/samples/language-capabilities.ptbk.md`,
    );

    if (!pipeline.sourceFile) {
        throw new Error(`Pipeline has no sourceFile`);
    }

    await forTime(100);

    const tools = {
        llm: createLlmToolsFromEnv(),
        script: [
            new JavascriptExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                },
            ),
        ],
    };

    const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

    const inputParameters = {
        /*/
        // https://promptbook.studio/samples/foreach-list.ptbk.md
        customers: spaceTrim(`
            Paul
            George
            Kate
        `),
        /**/
        /*/
        // https://promptbook.studio/samples/foreach-csv.ptbk.md
        customers: await readFile('./samples/pipelines/85-foreach.csv', 'utf-8'),
        /**/
        /**/
        // https://promptbook.studio/samples/simple-knowledge.ptbk.md
        eventTitle: 'LinkedIn',
        eventDescription: 'Professional CV',
        rules: 'Write best text for CV',
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
        pipeline.sourceFile.split('.ptbk.md').join('.report.md').split('.ptbk.json').join('.report.json'),
        //                  <- TODO: [0] More elegant way to replace extension
        stringifyPipelineJson(executionReport),
        'utf-8',
    );

    const executionReportString = executionReportJsonToString(executionReport);

    await writeFile(
        pipeline.sourceFile.split('.ptbk.md').join('.report.md').split('.ptbk.json').join('.report.md'),
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
 * TODO: [🧙‍♂️] Make sample with Wizzard supersimple-script.ts
 */
