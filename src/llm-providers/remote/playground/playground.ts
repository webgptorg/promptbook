#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { forEver, forTime } from 'waitasecond';
import { createPipelineCollectionFromDirectory } from '../../../collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory';
import { CLI_APP_ID, PLAYGROUND_APP_ID } from '../../../config';
import { AuthenticationError } from '../../../errors/AuthenticationError';
import { startRemoteServer } from '../../../remote-server/startRemoteServer';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { OpenAiExecutionTools } from '../../openai/OpenAiExecutionTools';
import '../../openai/register-constructor';
import { RemoteLlmExecutionTools } from '../RemoteLlmExecutionTools';

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

    console.info(colors.bgCyan('Playground:'), colors.bgWhite(`Starting remote server`));
    startRemoteServer({
        port: 4460,
        isVerbose: true,
        isAnonymousModeAllowed: true,
        isApplicationModeAllowed: true,
        collection: await createPipelineCollectionFromDirectory(
            './examples/pipelines/',
            {
                fs: $provideFilesystemForNode(),
            },
            {
                isRecursive: false,
            },
        ),
        async login(loginRequest) {
            const { appId, username, password } = loginRequest;

            const allowedApps = [PLAYGROUND_APP_ID, CLI_APP_ID];

            if (!allowedApps.includes(appId || '')) {
                throw new AuthenticationError(
                    `\`appId\` must be ${allowedApps.map((appId) => `"${appId}"`).join(' or ')} but got "${appId}"`,
                );
            }

            keepUnused(password);

            return {
                isSuccess: true,
                message: `User "${username}" logged in successfully`,
                identification: {
                    isAnonymous: false,
                    appId,
                    userId: 'user-' + username,
                    userToken: 'some-secret-token',
                },
            };
        },
        createLlmExecutionTools(options) {
            const { appId, userId, customOptions } = options;

            console.info(colors.bgCyan('Playground:'), { appId, userId, customOptions });
            return new OpenAiExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                    apiKey: process.env.OPENAI_API_KEY!,
                    userId: userId,
                },
            );
        },
    });

    for (const mode of ['anonymous', 'collection'] as const) {
        await forTime(500);
        console.info(colors.bgCyan('Playground:'), colors.bgWhite(`Creating RemoteLlmExecutionTools (${mode} mode) `));

        const remoteServerUrl = 'http://localhost:4460';

        const tools = new RemoteLlmExecutionTools(
            mode === 'anonymous'
                ? {
                      remoteServerUrl,
                      identification: {
                          isAnonymous: true,
                          userId: 'playground',
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
                      },
                  }
                : {
                      remoteServerUrl,
                      identification: {
                          isAnonymous: false,
                          appId: PLAYGROUND_APP_ID,
                          userId: 'playground',
                      },
                  },
        );

        await forTime(500);
        console.info(colors.bgCyan('Playground:'), colors.bgWhite(`Checking configuration...`));
        await tools.checkConfiguration();
        console.info(colors.bgCyan('Playground:'), colors.bgGreen(`Configuration checked!`));

        await forTime(500);
        console.info(colors.bgCyan('Playground:'), colors.bgWhite(`Listing models...`));
        const models = await tools.listModels();
        console.info({ models });
        console.info(colors.bgCyan('Playground:'), colors.bgGreen(`Models listed!`));
    }

    await forEver();

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
