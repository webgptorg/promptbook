#!/usr/bin/env ts-node

import {
    assertsExecutionSuccessful,
    // !!!! createLlmToolsFromEnv,
    createPipelineExecutor,
    executionReportJsonToString,
} from '@promptbook/core';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { createCollectionFromDirectory } from '@promptbook/node';
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
        console.error(colors.bgRed(error.name));
        console.error(error);
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

    console.log(pipeline.sourceFile);
    await forTime(100);

    const tools = {
        llm: [], // !!!! createLlmToolsFromEnv(),
        script: [
            new JavascriptExecutionTools({
                isVerbose: true,
            }),
        ],
    };

    // <- TODO: !!!! Use `createLlmToolsFromEnv` in all samples and READMEs

    const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

    // <- TODO: !!!! Why this is not prepared?

    const inputParameters = { eventNameX: 'CzechFutureTech' };
    const { isSuccessful, errors, outputParameters, executionReport } = await pipelineExecutor(
        inputParameters,
        (progress) => {
            console.info({ progress });
        },
    );

    console.info(outputParameters);

    if (!pipeline.sourceFile) {
        throw new Error(`Pipeline has no sourceFile`);
        process.exit(1);
    }

    /*
    TODO: After [🔼] !!!!
    await writeFile(
      pipeline.sourceFile.split('.ptbk.md').join('.report.json'),
        stringifyPipelineJson(executionReport),
        'utf-8',
    );
    */

    const executionReportString = executionReportJsonToString(executionReport);
    // TODO: !!! Unhardcode 50-advanced
    await writeFile(pipeline.sourceFile.split('.ptbk.md').join('.report.md'), executionReportString, 'utf-8');

    assertsExecutionSuccessful({ isSuccessful, errors });

    process.exit(0);
}

/**
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PipelineCollection.fromDirectory (directory vs folder)
 * TODO: [🧠] Maybe make .js version of simple-script
 * TODO: [🧙‍♂️] Make sample with Wizzard supersimple-script.ts
 */
