#!/usr/bin/env node

import { PromptTemplatePipelineLibrary } from '@promptbook/core';
import { JavascriptEvalExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { join } from 'path';

dotenv.config({ path: '../../../.env' });

main();

async function main() {
    const library = PromptTemplatePipelineLibrary.fromSources({
        advanced: await readFile(join(process.cwd(), '../../templates/50-advanced.ptp.md'), 'utf-8'),
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
}

/**
 * TODO: !!! Identify PTPs by URL
 * TODO: !!! No need to set this script or userInterface in tools
 * TODO: !!! Use PromptTemplatePipelineLibrary.fromDirectory (directory vs folder)
 * TODO: !!! Also sample with Wizzard
 */
