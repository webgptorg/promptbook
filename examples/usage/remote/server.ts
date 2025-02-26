#!/usr/bin/env ts-node

/*
Note: [🔁] In your app you will be importing '../../../src/_packages/core' instead of '../../../src/_packages/core.index.index',...
*/

import colors from 'colors';
import * as dotenv from 'dotenv';
import { forEver } from 'waitasecond';
import { $provideExecutionToolsForNode, createCollectionFromDirectory } from '../../../src/_packages/node.index';
import { OpenAiExecutionTools } from '../../../src/_packages/openai.index';
import { startRemoteServer } from '../../../src/_packages/remote-server.index';

import '../../../src/_packages/anthropic-claude.index';
import '../../../src/_packages/azure-openai.index';
import '../../../src/_packages/openai.index';

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

// TODO: [🍓] This must work - BUT first do browser example

async function main() {
    console.info(colors.bgWhite('🔵 Testing remote server of PromptBook'));

    const tools = await $provideExecutionToolsForNode();
    const collection = await createCollectionFromDirectory('./examples/pipelines/', tools);

    // [⚖]
    startRemoteServer({
        path: '/promptbook',
        port: 4460,
        collection,
        isAnonymousModeAllowed: true,
        isApplicationModeAllowed: true,
        createLlmExecutionTools(options) {
            const { userId } = options;
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

    await forEver();
}

/**
 * TODO: There should be no need to set this script or userInterface in tools
 * TODO: Implement and use here PipelineCollection.fromDirectory ([📂] directory vs folder)
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 */
