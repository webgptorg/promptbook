#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
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

    /*/
    // TODO: !!!!! This should work
    const models = await anthropicClaudeExecutionTools.listModels();
    console.info({ models });
    /**/

    /*/
     // TODO: !!!!! This should work
    const prompt = {
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'COMPLETION',
        },
    } as const;
    const promptResult = await anthropicClaudeExecutionTools.gptComplete(prompt);
    console.info({ promptResult });
    console.info(chalk.green(prompt.content + promptResult.content));
    /**/

    /**/
    // TODO: !!!!! This should work
    const prompt = {
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'CHAT',
        },
    } as const;
    const promptResult = await anthropicClaudeExecutionTools.gptChat(prompt);
    console.info({ promptResult });
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Chat: ') + chalk.green(promptResult.content));
    /**/

    //========================================/

    console.info(`[ Done 🧸  Anthropic Claude Playground ]`);
}
