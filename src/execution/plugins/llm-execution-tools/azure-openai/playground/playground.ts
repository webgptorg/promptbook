#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import { AzureOpenAiExecutionTools } from './../AzureOpenAiExecutionTools';

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

    /**/
    const models = await azureOpenAiExecutionTools.listModels();
    console.info({ models });
    /**/

    /*/
    const prompt = {
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'COMPLETION',
        },
    } as const;
    const promptResult = await azureOpenAiExecutionTools.gptComplete(prompt);
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
    const promptResult = await azureOpenAiExecutionTools.gptChat(prompt);
    console.info({ promptResult });
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Chat: ') + chalk.green(promptResult.content));
    /**/

    //========================================/

    console.info(`[ Done 🧸  Azure OpenAI Playground ]`);
}
