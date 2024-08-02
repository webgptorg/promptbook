#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { AnthropicClaudeExecutionTools } from '../AnthropicClaudeExecutionTools';

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
    console.info(`🧸  Anthropic Claude Playground`);

    // Do here stuff you want to test
    //========================================>

    const anthropicClaudeExecutionTools = new AnthropicClaudeExecutionTools({
        isVerbose: true,
        apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
    });

    keepUnused(anthropicClaudeExecutionTools);
    keepUnused<Prompt>();

    /*/
    const models = await anthropicClaudeExecutionTools.listModels();
    console.info({ models });
    /**/

    /*/
    // TODO: [👏] Make Claude completion models work
    const completionPrompt = {
        title: 'Hello',
        parameters: {},
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'COMPLETION',
        },
    } as const satisfies Prompt;
    const completionPromptResult = await anthropicClaudeExecutionTools.callCompletionModel(completionPrompt);
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
            temperature: 1,
        },
    } as const satisfies Prompt;
    const chatPromptResult = await anthropicClaudeExecutionTools.callChatModel(chatPrompt);
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
 * TODO: !!! Test here that `systemMessage`, `temperature` and `seed` are working correctly
 */
