#!/usr/bin/env node

import { JavascriptEvalExecutionTools, OpenAiExecutionTools, PromptTemplatePipelineLibrary } from '@gptp/core';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { join } from 'path';

dotenv.config({ path: '../../../.env' });

main();

async function main() {
    const library = PromptTemplatePipelineLibrary.fromSources({
        // TODO: !!! Identify PTPs by URL
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
            /* TODO: !!! No need to set this */
        ],
        userInterface: null /* TODO: !!! No need to set this */,
    };

    const executor = library.createExecutor('advanced', tools);

    const input = { word: 'cat' };
    const output = await executor(input);

    console.info(output);
}

/**
 * TODO: !!! Use PromptTemplatePipelineLibrary.fromDirectory (directory vs folder)
 * TODO: !!! Also sample with Wizzard
 */
