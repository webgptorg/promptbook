#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'yoctocolors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { embeddingVectorToString } from '../../../execution/embeddingVectorToString';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
// import { OllamaAssistantExecutionTools } from '../OllamaAssistantExecutionTools';
import type { Usage } from '../../../execution/Usage';
import { countUsage } from '../../_common/utils/count-total-usage/countUsage';
import { createOllamaExecutionTools } from '../createOllamaExecutionTools';

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
    console.info(`🧸  Ollama Playground`);

    // Do here stuff you want to test
    //========================================>

    const ollamaExecutionTools = createOllamaExecutionTools({
        isVerbose: true,
    });

    const ollamaExecutionToolsWithUsage = countUsage(ollamaExecutionTools);

    ollamaExecutionToolsWithUsage.spending().subscribe((usage: Usage) => {
        const wordCount = (usage?.input?.wordsCount?.value || 0) + (usage?.output?.wordsCount?.value || 0);
        console.log(`[💸] Spending ${wordCount} words`);
    });

    keepUnused(ollamaExecutionTools);
    keepUnused(embeddingVectorToString);
    keepUnused(usageToHuman);
    keepUnused<Prompt>();

    /*/
    const models = await ollamaExecutionTools.listModels();
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
    const completionPromptResult = await ollamaExecutionTools.callCompletionModel(completionPrompt);
    console.info({ completionPromptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(chalk.green(completionPrompt.content + completionPromptResult.content));
    /**/

    /**/
    const chatPrompt = {
        title: 'Promptbook speech',
        parameters: {},
        content: `Hello`,
        modelRequirements: {
            modelVariant: 'CHAT',
            // modelName: 'mistral',
            systemMessage: 'You are an assistant who only speaks in rhymes.',
            temperature: 1.5,
        },
    } as const satisfies Prompt;
    const chatPromptResult = await ollamaExecutionToolsWithUsage.callChatModel!(chatPrompt);
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
    const promptResult = await ollamaExecutionTools.callEmbeddingModel(prompt);
    console.info({ promptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Embedding: ') + chalk.green(embeddingVectorToString(promptResult.content)));
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
