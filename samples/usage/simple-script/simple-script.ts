#!/usr/bin/env ts-node

import { createPipelineExecutor, executionReportJsonToString, stringifyPipelineJson } from '@promptbook/core';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { createCollectionFromDirectory, createLlmToolsFromEnv } from '@promptbook/node';
import colors from 'colors';
import * as dotenv from 'dotenv';
import { writeFile } from 'fs/promises';
import { forTime } from 'waitasecond';

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

    const collection = await createCollectionFromDirectory('./samples/templates/', {
        llmTools: null,
        isVerbose: true,
        isRecursive: false,
        isCrashedOnError: true,
    });

    // TODO: Allow user to pick pipeline
    // > const pipelineUrls = await collection.listPipelines();
    // @see https://nodejs.org/en/learn/command-line/accept-input-from-the-command-line-in-nodejs

    const pipeline = await collection.getPipelineByUrl(
        'https://promptbook.studio/samples/simple-knowledge.ptbk.md',
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
            new JavascriptExecutionTools({
                isVerbose: true,
            }),
        ],
    };

    const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

    const inputParameters = {
        eventName: 'TypeScript developers summit 2025',
    };
    const { isSuccessful, errors, warnings, outputParameters, executionReport } = await pipelineExecutor(
        inputParameters,
        (progress) => {
            console.info({ progress });
        },
    );

    console.info('outputParameters', outputParameters);

    await writeFile(
        pipeline.sourceFile.split('.ptbk.md').join('.report.json'),
        stringifyPipelineJson(executionReport),
        'utf-8',
    );

    const executionReportString = executionReportJsonToString(executionReport);
    // TODO: !!! Unhardcode 50-advanced
    await writeFile(
        pipeline.sourceFile.split('.ptbk.md').join('.report.md').split('.ptbk.json').join('.report.md'),
        //                  <- TODO: More elegant way to replace extension
        executionReportString,
        'utf-8',
    );

    for (const error of errors) {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
    }

    for (const warning of warnings) {
        console.error(colors.bgYellow(warning.name /* <- 11:11 */));
        console.error(colors.yellow(warning.stack || warning.message));
    }

    const { bio } = outputParameters;

    console.info(colors.green(bio));

    process.exit(isSuccessful ? 0 : 1);
}

/**
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PipelineCollection.fromDirectory (directory vs folder)
 * TODO: [🧠] Maybe make .js version of simple-script
 * TODO: [🧙‍♂️] Make sample with Wizzard supersimple-script.ts
 */
