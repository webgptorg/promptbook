#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { AzureOpenAiExecutionTools } from '../AzureOpenAiExecutionTools';

playground()
    .catch((error) => {
        console.error(chalk.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Azure OpenAI Playground`);

    // Do here stuff you want to test
    //========================================>

    const azureOpenAiExecutionTools = new AzureOpenAiExecutionTools({
        isVerbose: true,
        resourceName: process.env.AZUREOPENAI_RESOURCE_NAME!,
        deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME!,
        apiKey: process.env.AZUREOPENAI_API_KEY!,
    });

    keepUnused(azureOpenAiExecutionTools);
    keepUnused<Prompt>();

    /*/
    const models = await azureOpenAiExecutionTools.listModels();
    console.info({ models });
    /**/

    /*/
    const completionPrompt = {
        title: 'Hello',
        parameters: {},
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'COMPLETION',
        },
    } as const satisfies Prompt;
    const completionPromptResult = await azureOpenAiExecutionTools.callCompletionModel(completionPrompt);
    console.info({ completionPromptResult });
    console.info(chalk.green(completionPrompt.content + completionPromptResult.content));
    /**/

    /*/
    const chatPrompt = {
        title: 'Hello',
        parameters: {},
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'CHAT',
        },
    } as const satisfies Prompt;
    const chatPromptResult = await azureOpenAiExecutionTools.callChatModel(chatPrompt);
    console.info({ chatPromptResult });
    console.info(chalk.bgBlue(' User: ') + chalk.blue(chatPrompt.content));
    console.info(chalk.bgGreen(' Completion: ') + chalk.green(chatPromptResult.content));
    /**/

    /*/
    // TODO: Test Translations in playground
    /**/

    /*/
    // TODO: Test Embeddings in playground
    /**/

    /*/
    // <- Note: [🤖] Test here new model variant if needed
    /**/

    //========================================/
}

/**
 * TODO: Test here that `systemMessage`, `temperature` and `seed` are working correctly
 */
