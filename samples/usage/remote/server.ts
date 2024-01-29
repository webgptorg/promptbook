#!/usr/bin/env ts-node

import { PromptTemplatePipelineLibrary } from '@promptbook/core';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { runRemoteServer } from '@promptbook/remote-server';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(chalk.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main();

async function main() {
    console.info(chalk.bgGray('🔵 Testing remote server of PromptBook'));

    const library = PromptTemplatePipelineLibrary.fromSources({
        advanced: (await readFile('./samples/templates/50-advanced.ptbk.md', 'utf-8')) as any,
    });

    runRemoteServer({
        port: 4460,
        ptbkLibrary: library,
        createNaturalExecutionTools(/* clientId */) {
            // console.log('clientId', clientId);
            // TODO: !!! Use clientId with logging
            return new OpenAiExecutionTools({
                isVerbose: true,
                openAiApiKey: process.env.OPENAI_API_KEY!,
                user: 'here-put-user-id',
            });
        },
    });
}

/**
 * TODO: !!! Identify PTPs by URL
 * TODO: !!! No need to set this script or userInterface in tools
 * TODO: !!! Use PromptTemplatePipelineLibrary.fromDirectory (directory vs folder)
 * TODO: !!! Also sample with Wizzard
 */
