#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import { OpenAiExecutionTools } from '../OpenAiExecutionTools';

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
    console.info(`🧸  OpenAI Playground`);

    // Do here stuff you want to test
    //========================================>

    const openAiExecutionTools = new OpenAiExecutionTools({
        isVerbose: true,
        apiKey: process.env.OPENAI_API_KEY!,
    });

    /*/
    const models = await openAiExecutionTools.listModels();
    console.info({ models });
    /**/

    /*/
    const prompt = {
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'COMPLETION',
        },
    } as const;
    const promptResult = await openAiExecutionTools.gptComplete(prompt);
    console.info({ promptResult });
    console.info(chalk.green(prompt.content + promptResult.content));
    /**/

    /*/
    const prompt = {
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'CHAT',
        },
    } as const;
    const promptResult = await openAiExecutionTools.gptChat(prompt);
    console.info({ promptResult });
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Completion: ') + chalk.green(promptResult.content));
    /**/

    /*/
    // TODO: Test Translations in playground
    /**/

    /**/
    const prompt = {
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'EMBEDDING',
            modelName: 'text-embedding-ada-003',
        },
    } as const;
    const promptResult = await openAiExecutionTools.embed(prompt);
    console.info({ promptResult });
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Embedding: ') + chalk.green(promptResult.content));
    /**/

    //========================================/
}
