#!/usr/bin/env ts-node

import { createPromptbookLibraryFromDirectory } from '@promptbook/core';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { startRemoteServer } from '@promptbook/remote-server';
import colors from 'colors';
import * as dotenv from 'dotenv';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main();

// TODO: [🍓] This must work - BUT first do browser sample

async function main() {
    console.info(colors.bgWhite('🔵 Testing remote server of PromptBook'));

    const library = await createPromptbookLibraryFromDirectory('./samples/templates/');

    // [⚖]
    startRemoteServer({
        path: '/promptbook',
        port: 4460,
        library,
        createLlmExecutionTools(clientId) {
            console.log('clientId', clientId);
            return new OpenAiExecutionTools({
                isVerbose: true,
                apiKey: process.env.OPENAI_API_KEY!,
                user: clientId,
            });
        },
    });
}

/**
 * TODO: [🈴] !!!!! Identify PROMPTBOOKs by URL in this sample
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PromptbookLibrary.fromDirectory (directory vs folder)
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 */
