#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { embeddingVectorToString } from '../../../execution/embeddingVectorToString';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { OpenAiExecutionTools } from '../OpenAiExecutionTools';

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
    console.info(`🧸  OpenAI Playground`);

    // Do here stuff you want to test
    //========================================>

    const openAiExecutionTools = new OpenAiExecutionTools({
        isVerbose: true,
        apiKey: process.env.OPENAI_API_KEY!,
    });

    keepUnused(openAiExecutionTools);
    keepUnused(embeddingVectorToString);
    keepUnused<Prompt>();

    /*/
    const models = await openAiExecutionTools.listModels();
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
    const completionPromptResult = await openAiExecutionTools.callCompletionModel(completionPrompt);
    console.info({ completionPromptResult });
    console.info(chalk.green(completionPrompt.content + completionPromptResult.content));
    /**/

    /**/
    const chatprompt = {
        title: 'Poem about Prague',
        parameters: {},
        content: `Write me something about Prague`,
        modelRequirements: {
            modelVariant: 'CHAT',
            systemMessage: 'You are an assistant who only speaks in rhymes.',
            temperature: 1.5,
        },
    } as const satisfies Prompt;
    const chatpromptResult = await openAiExecutionTools.callChatModel(chatprompt);
    console.info({ chatpromptResult });
    console.info(colors.bgBlue(' User: ') + colors.blue(chatprompt.content));
    console.info(colors.bgGreen(' Completion: ') + colors.green(chatpromptResult.content));
    /**/

    /*/
    // TODO: Test Translations in playground
    /**/

    /*/
    const prompt = {
        title: 'Hello',
        parameters: {},
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'EMBEDDING',
            // modelName: 'text-embedding-ada-002',
        },
    } as const satisfies Prompt;
    const promptResult = await openAiExecutionTools.callEmbeddingModel(prompt);
    console.info({ promptResult });
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Embedding: ') + chalk.green(embeddingVectorToString(promptResult.content)));
    /**/

    /*/
    // <- Note: [🤖] Test here new model variant if needed
    /**/

    //========================================/
}

/**
 * TODO: !!! Test here that `systemMessage`, `temperature` and `seed` are working correctly
 */
