#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { createAnthropicClaudeExecutionTools } from '../createAnthropicClaudeExecutionTools';

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
    console.info(`🧸  Anthropic Claude Playground`);

    // Do here stuff you want to test
    //========================================>

    const anthropicClaudeExecutionTools = createAnthropicClaudeExecutionTools({
        // isProxied: true,
        // remoteUrl: DEFAULT_REMOTE_URL,
        // path: DEFAULT_REMOTE_URL_PATH, // <- [🧜‍♂️]
        isVerbose: true,
        apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
    });

    keepUnused(anthropicClaudeExecutionTools);
    keepUnused(usageToHuman);
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
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
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
        expectFormat: 'JSON',
    } as const satisfies Prompt;
    const chatPromptResult = await anthropicClaudeExecutionTools.callChatModel(chatPrompt);
    console.info({ chatPromptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
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
 * TODO: !!! Playground with WebGPT / Promptbook.studio anonymous server
 * TODO: !!! Test here that `systemMessage`, `temperature` and `seed` are working correctly
 */
