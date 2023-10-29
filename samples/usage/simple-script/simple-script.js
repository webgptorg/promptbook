#!/usr/bin/env node

// !!!! Fix
import { JavascriptEvalExecutionTools, OpenAiExecutionTools, PromptTemplatePipelineLibrary } from '@gptp/core';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { join } from 'path';

dotenv.config({ path: '../../../.env' });

main();

async function main() {
    const library = PromptTemplatePipelineLibrary.fromSources({
        advanced: await readFile(join(process.cwd(), '../../templates/10-single.ptp.md'), 'utf-8'),
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
