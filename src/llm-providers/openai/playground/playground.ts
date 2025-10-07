#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { embeddingVectorToString } from '../../../execution/embeddingVectorToString';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
// import { OpenAiAssistantExecutionTools } from '../OpenAiAssistantExecutionTools';
import type { Usage } from '../../../execution/Usage';
import { countUsage } from '../../_common/utils/count-total-usage/countUsage';
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

    const openAiExecutionTools = new OpenAiExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            isVerbose: true,
            userId: 'playground',
            apiKey: process.env.OPENAI_API_KEY!,
        },
    );

    const openAiExecutionToolsWithUsage = countUsage(openAiExecutionTools);

    openAiExecutionToolsWithUsage.spending().subscribe((usage: Usage) => {
        const wordCount = (usage?.input?.wordsCount?.value || 0) + (usage?.output?.wordsCount?.value || 0);
        console.log(`[💸] Spending ${wordCount} words`);
    });

    /*/
    const openAiAssistantExecutionTools = new OpenAiAssistantExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            isVerbose: true,
            userId: 'playground',
            apiKey: process.env.OPENAI_API_KEY!,
            assistantId: 'asst_CJCZzFCbBL0f2D4OWMXVTdBB',
            //            <- Note: This is not a private information, just ID of the assistant which is accessible only with correct API key
        },
    );
    /**/

    keepUnused(openAiExecutionTools);
    // keepUnused(openAiAssistantExecutionTools);
    keepUnused(embeddingVectorToString);
    keepUnused(usageToHuman);
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
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(chalk.green(completionPrompt.content + completionPromptResult.content));
    /**/

    /**/
    const chatPrompt = {
        title: 'Prague',
        parameters: {},
        thread: [
            // <- TODO: !!! Maybe rename to `previousMessages`
            {
                id: 'msg1', // <- TODO: !!!! Do not require id in messages
                from: 'user', // <- TODO: Standardize to `role: 'USER' | 'ASSISTANT'
                content: 'Where is Prague ',
            },
            {
                id: 'msg2',
                from: 'assistant',
                content: 'Prague is a beautiful city located in the Czech Republic.',
            },
        ],
        content: `Tell me more`,
        modelRequirements: {
            modelVariant: 'CHAT',
            systemMessage: 'You are an helpful assistant who provides short and concise answers.',
            modelName: 'gpt-3.5-turbo',
            temperature: 1.5,
        },
    } /* as const */ satisfies Prompt;
    const chatPromptResult = await openAiExecutionToolsWithUsage.callChatModel!(chatPrompt);
    console.info({ chatPromptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(colors.bgBlue(' User: ') + colors.blue(chatPrompt.content));
    console.info(colors.bgGreen(' Chat: ') + colors.green(chatPromptResult.content));
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
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Embedding: ') + chalk.green(embeddingVectorToString(promptResult.content)));
    /**/

    /*/
    const chatPrompt = {
        title: 'Promptbook speech',
        parameters: {},
        content: `Write me speech about Promptbook and how it can help me to build the most beautiful chatbot and change the world`,
        modelRequirements: {
            modelVariant: 'CHAT',
            // TODO: [👨‍👨‍👧‍👧] systemMessage: 'You are an assistant who only speaks in rhymes.',
            // TODO: [👨‍👨‍👧‍👧] temperature: 1.5,
        },

        /*
        [🗯]
        replyingTo: {

        }
        * /
    } as const satisfies Prompt;
    const chatPromptResult = await openAiAssistantExecutionTools.callChatModel(chatPrompt);
    console.info({ chatPromptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(colors.bgBlue(' User: ') + colors.blue(chatPrompt.content));
    console.info(colors.bgGreen(' Assistant: ') + colors.green(chatPromptResult.content));
    /**/

    /*/
    const openai = await openAiExecutionTools.getClient();
    const stream = openai.beta.threads.createAndRunStream({
        stream: true,
        assistant_id: 'asst_CJCZzFCbBL0f2D4OWMXVTdBB',
        //             <- Note: This is not a private information, just ID of the assistant which is accessible only with correct API key
        thread: {
            messages: [{ role: 'user', content: 'What is the meaning of life? I want breathtaking speech.' }],
        },
    });

    console.log(stream);

    stream.on('connect', () => {
        console.log('connect', stream.currentEvent);
    });

    stream.on('messageDelta', (messageDelta) => {
        console.log('messageDelta', (messageDelta as any).content[0].text);
    });

    stream.on('messageCreated', (message) => {
        console.log('messageCreated', message);
    });

    stream.on('messageDone', (message) => {
        console.log('messageDone', message);
    });

    const finalMessages = await stream.finalMessages();
    console.log('finalMessages', finalMessages, finalMessages[0]!.content[0]!);

    /**/

    /*/
    // <- Note: [🤖] Test here new model variant if needed
    /**/

    //========================================/
}

/**
 * TODO: [main] !!3 Test here that `systemMessage`, `temperature` and `seed` are working correctly
 * Note: [⚫] Code in this file should never be published in any package
 */
