#!/usr/bin/env node

import { createPromptbookLibraryFromSources } from '@promptbook/core';
import { JavascriptEvalExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { assertsExecutionSuccessful, executionReportJsonToString } from '@promptbook/utils';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { readFile, writeFile } from 'fs/promises';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(chalk.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main();

async function main() {
    console.info(chalk.bgGray('⚪ Testing basic capabilities of PromptBook'));

    const promptbookUrl = 'https://promptbook.example.com/samples/language-capabilities.ptbk.md@v1';

    const library = createPromptbookLibraryFromSources(
        await readFile(`./samples/templates/${sampleName}.ptbk.md`, 'utf-8'),
    );

    const tools = {
        natural: new OpenAiExecutionTools({
            isVerbose: true,
            openAiApiKey: process.env.OPENAI_API_KEY,
        }),
        script: [
            new JavascriptEvalExecutionTools({
                isVerbose: true,
            }),
        ],
        userInterface: null,
    };

    const executor = library.getPromptbookByUrl((await library.listPromptbooks())[0]);

    const inputParameters = { word: 'cat' };
    const { isSuccessful, errors, outputParameters, executionReport } = await executor(inputParameters);

    console.info(outputParameters);

    await writeFile(
        `./samples/templates/${sampleName}.report.json`,
        JSON.stringify(executionReport, null, 4) + '\n',
        'utf-8',
    );

    const executionReportString = executionReportJsonToString(executionReport);
    await writeFile(`./samples/templates/${sampleName}.report.md`, executionReportString, 'utf-8');

    assertsExecutionSuccessful({ isSuccessful, errors });

    process.exit(0);
}

/**
 * TODO: [🈴] !!! Identify PROMPTBOOKs by URL
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PromptbookLibrary.fromDirectory (directory vs folder)
 * TODO: Make sample with Wizzard
 */
