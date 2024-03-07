#!/usr/bin/env ts-node

import { PromptbookLibrary } from '@promptbook/core';
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

    const library = PromptbookLibrary.fromSources(
        {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            advanced: (await readFile('./samples/templates/50-advanced.ptbk.md', 'utf-8')) as any,
        },
        {
            maxExecutionAttempts: 3,
        },
    );

    runRemoteServer({
        path: '/promptbook',
        port: 4460,
        promptbookLibrary: library,
        createNaturalExecutionTools(clientId) {
            console.log('clientId', clientId);
            return new OpenAiExecutionTools({
                isVerbose: true,
                openAiApiKey: process.env.OPENAI_API_KEY!,
                user: clientId,
            });
        },
    });
}

/**
 * TODO: [🈴] Identify PROMPTBOOKs by URL
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PromptbookLibrary.fromDirectory (directory vs folder)
 * TODO: [🧙‍♂️] Make sample with Wizzard
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 */
