#!/usr/bin/env ts-node

import { CallbackInterfaceTools, createPromptbookExecutor, createPromptbookLibraryFromSources } from '@promptbook/core';
import { JavascriptEvalExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { assertsExecutionSuccessful, executionReportJsonToString } from '@promptbook/utils';
import colors from 'colors';
import * as dotenv from 'dotenv';
import { readFile, writeFile } from 'fs/promises';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main();

async function main() {
    console.info(colors.bgWhite('⚪ Testing basic capabilities of PromptBook'));

    // const promptbookUrl = 'https://promptbook.example.com/samples/language-capabilities.ptbk.md@v1';

    const library = createPromptbookLibraryFromSources(
        // TODO:[🍓] !!! Use createPromptbookLibraryFromDirectory
        (await readFile(`./samples/templates/50-advanced.ptbk.md`, 'utf-8')) as any,
    );

    const promptbook = library.getPromptbookByUrl((await library.listPromptbooks())[0]);

    const tools = {
        llm: new OpenAiExecutionTools({
            // TODO: [♐] Pick just the best model of required variant
            isVerbose: true,
            apiKey: process.env.OPENAI_API_KEY,
        }),
        script: [
            new JavascriptEvalExecutionTools({
                isVerbose: true,
            }),
        ]
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
        // TODO: !!! Unhardcode 50-advanced
        `./samples/templates/50-advanced.report.json`,
        JSON.stringify(executionReport, null, 4) + '\n',
        'utf-8',
    );

    const executionReportString = executionReportJsonToString(executionReport);
    // TODO: !!! Unhardcode 50-advanced
    await writeFile(`./samples/templates/50-advanced.report.md`, executionReportString, 'utf-8');

    assertsExecutionSuccessful({ isSuccessful, errors });

    process.exit(0);
}

/**
 * TODO: [🈴] !!! Identify PROMPTBOOKs by URL in this sample
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PromptbookLibrary.fromDirectory (directory vs folder)
 * TODO: [🧠] Maybe make .js version of simple-script
 * TODO: Make sample with Wizzard
 */
