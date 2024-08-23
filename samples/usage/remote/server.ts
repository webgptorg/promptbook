#!/usr/bin/env ts-node

import { createCollectionFromDirectory } from '@promptbook/node';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { startRemoteServer } from '@promptbook/remote-server';
import colors from 'colors';
import * as dotenv from 'dotenv';
import { forEver } from 'waitasecond';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main()
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

// TODO: [🍓] This must work - BUT first do browser sample

async function main() {
    console.info(colors.bgWhite('🔵 Testing remote server of PromptBook'));

    const collection = await createCollectionFromDirectory('./samples/templates/');

    // [⚖]
    startRemoteServer({
        path: '/promptbook',
        port: 4460,
        collection,
        isAnonymousModeAllowed: true,
        isCollectionModeAllowed: true,
        createLlmExecutionTools(userId) {
            // <- TODO: [🧠][🤺] Remove `createLlmExecutionTools`, pass just `llmExecutionTools`
            console.log('userId', userId);
            return new OpenAiExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                    apiKey: process.env.OPENAI_API_KEY!,
                    user: userId,
                },
            );
        },
    });

    await forEver();
}

/**
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PipelineCollection.fromDirectory ([📂] directory vs folder)
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 */
