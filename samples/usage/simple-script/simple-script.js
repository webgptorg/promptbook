#!/usr/bin/env node

import { PromptTemplatePipelineLibrary } from '@promptbook/core';
import { JavascriptEvalExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
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

    const library = PromptTemplatePipelineLibrary.fromSources({
        advanced: await readFile('./samples/templates/50-advanced.ptbk.md', 'utf-8'),
    });

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

    const executor = library.createExecutor('advanced', tools);

    const input = { word: 'cat' };
    const output = await executor(input);

    console.info(output);


    const executionReportString = executionReportJsonToString(output.executionReport /* <- !!!!! */);
     await writeFile('./samples/templates/50-advanced.report.md',executionReportString, 'utf-8'),
}

/**
 * TODO: !!! Identify PTPs by URL
 * TODO: !!! No need to set this script or userInterface in tools
 * TODO: !!! Use PromptTemplatePipelineLibrary.fromDirectory (directory vs folder)
 * TODO: !!! Also sample with Wizzard
 */
