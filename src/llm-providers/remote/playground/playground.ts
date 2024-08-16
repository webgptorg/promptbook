#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { forEver, forTime } from 'waitasecond';
import { createCollectionFromDirectory } from '../../../collection/constructors/createCollectionFromDirectory';
import { OpenAiExecutionTools } from '../../openai/OpenAiExecutionTools';
import { startRemoteServer } from '../startRemoteServer';

playground()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Remote server playground`);

    // Do here stuff you want to test
    //========================================>

    startRemoteServer({
        path: '/promptbook',
        port: 4460,
        isVerbose: true,
        isAnonymousModeAllowed: true,
        isCollectionModeAllowed: true,
        collection: await createCollectionFromDirectory('./samples/templates/', { llmTools: null, isRecursive: false }),
        createLlmExecutionTools(clientId) {
            // <- TODO: [🧠][🤺] Remove `createLlmExecutionTools`, pass just `llmExecutionTools`
            console.log('clientId', clientId);
            return new OpenAiExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                    apiKey: process.env.OPENAI_API_KEY!,
                    user: clientId,
                },
            );
        },
    });

    await forTime(1000);

    await forEver();

    //========================================/
}
