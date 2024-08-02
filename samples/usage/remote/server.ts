#!/usr/bin/env ts-node

import { createCollectionFromDirectory } from '@promptbook/node';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { startRemoteServer } from '@promptbook/remote-server';
import colors from 'colors';
import * as dotenv from 'dotenv';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main()
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name));
        console.error(error);
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
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PipelineCollection.fromDirectory (directory vs folder)
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 */
