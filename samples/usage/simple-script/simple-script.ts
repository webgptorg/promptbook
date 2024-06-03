#!/usr/bin/env ts-node

import {
    assertsExecutionSuccessful,
    createPromptbookExecutor,
    createPromptbookLibraryFromDirectory,
    executionReportJsonToString,
} from '@promptbook/core';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
import colors from 'colors';
import * as dotenv from 'dotenv';
import { writeFile } from 'fs/promises';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main();

async function main() {
    console.info(colors.bgWhite('⚪ Testing basic capabilities of Promptbook'));

    const library = await createPromptbookLibraryFromDirectory('./samples/templates/');
    const promptbook = await library.getPromptbookByUrl(
        `https://promptbook.example.com/samples/language-capabilities.ptbk.md`,
    );

    const tools = {
        llm: new OpenAiExecutionTools({
            isVerbose: true,
            apiKey: process.env.OPENAI_API_KEY,
        }),
        script: [
            new JavascriptExecutionTools({
                isVerbose: true,
            }),
        ],
    };

    const promptbookExecutor = createPromptbookExecutor({ promptbook, tools });

    const inputParameters = { word: 'cat' };
    const { isSuccessful, errors, outputParameters, executionReport } = await promptbookExecutor(
        inputParameters,
        (progress) => {
            console.info({ progress });
        },
    );

    console.info(outputParameters);

    await writeFile(
        // TODO: !!! Unhardcode language-capabilities
        `./samples/templates/language-capabilities.report.json`,
        JSON.stringify(executionReport, null, 4) + '\n',
        'utf-8',
    );

    const executionReportString = executionReportJsonToString(executionReport);
    // TODO: !!! Unhardcode 50-advanced
    await writeFile(`./samples/templates/language-capabilities.report.md`, executionReportString, 'utf-8');

    assertsExecutionSuccessful({ isSuccessful, errors });

    process.exit(0);
}

/**
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PromptbookLibrary.fromDirectory (directory vs folder)
 * TODO: [🧠] Maybe make .js version of simple-script
 * TODO: Make sample with Wizzard
 */
