#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { forEver, forTime } from 'waitasecond';
import { createCollectionFromDirectory } from '../../../collection/constructors/createCollectionFromDirectory';
import { OpenAiExecutionTools } from '../../openai/OpenAiExecutionTools';
import '../../openai/register-constructor';
import { RemoteLlmExecutionTools } from '../RemoteLlmExecutionTools';
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

    console.info(colors.bgWhite(`Starting remote server`));
    startRemoteServer({
        path: '/promptbook',
        port: 4460,
        isVerbose: true,
        isAnonymousModeAllowed: true,
        isCollectionModeAllowed: true,
        collection: await createCollectionFromDirectory('./samples/templates/', { llmTools: null, isRecursive: false }),
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

    for (const mode of ['anonymous', 'collection'] as const) {
        await forTime(500);
        console.info(colors.bgWhite(`Creating RemoteLlmExecutionTools (${mode} mode) `));

        const remoteUrl = 'http://localhost:4460';
        const path = '/promptbook';

        const tools = new RemoteLlmExecutionTools(
            mode === 'anonymous'
                ? {
                      remoteUrl,
                      path,
                      isAnonymous: true,
                      llmToolsConfiguration: [
                          {
                              title: 'OpenAI',
                              packageName: '@promptbook/openai',
                              className: 'OpenAiExecutionTools',
                              options: {
                                  apiKey: process.env.OPENAI_API_KEY!,
                              },
                          },
                      ],
                  }
                : {
                      remoteUrl,
                      path,
                      isAnonymous: false,
                      userId: 'pavol1234',
                  },
        );

        await forTime(500);
        console.info(colors.bgWhite(`Checking configuration....`));
        await tools.checkConfiguration();
        console.info(colors.bgGreen(`Configuration checked!`));

        await forTime(500);
        console.info(colors.bgWhite(`Listing models....`));
        const models = await tools.listModels();
        console.info(colors.bgGreen(`Models listed!`));
        console.info({ models });
    }

    await forEver();

    //========================================/
}
