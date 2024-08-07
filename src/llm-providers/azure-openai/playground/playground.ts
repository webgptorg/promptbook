#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { AzureOpenAiExecutionTools } from '../AzureOpenAiExecutionTools';

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

    /**/
    const chatPrompt = {
        title: 'Poem about Prague',
        parameters: {},
        content: `Write me something about Prague`,
        modelRequirements: {
            modelVariant: 'CHAT',
            systemMessage: 'You are an assistant who only speaks in rhymes.',
            temperature: 1.5,
        },
    } as const satisfies Prompt;
    const chatPromptResult = await azureOpenAiExecutionTools.callChatModel(chatPrompt);
    console.info({ chatPromptResult });
    console.info(colors.bgBlue(' User: ') + colors.blue(chatPrompt.content));
    console.info(colors.bgGreen(' Completion: ') + colors.green(chatPromptResult.content));
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
