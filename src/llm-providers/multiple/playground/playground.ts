#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import { embeddingVectorToString } from '../../../execution/embeddingVectorToString';
import { JavascriptExecutionTools } from '../../../scripting/javascript/JavascriptExecutionTools';
import { AnthropicClaudeExecutionTools } from '../../anthropic-claude/AnthropicClaudeExecutionTools';
import { AzureOpenAiExecutionTools } from '../../azure-openai/AzureOpenAiExecutionTools';
import { OpenAiExecutionTools } from '../../openai/OpenAiExecutionTools';
import { joinLlmExecutionTools } from '../joinLlmExecutionTools';

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
    console.info(`🧸  Multiple LLMs Playground`);

    // Do here stuff you want to test
    //========================================>

    const tools = {
        llm: [
            new OpenAiExecutionTools({
                isVerbose: true,
                apiKey: process.env.OPENAI_API_KEY!,
            }),
            new AnthropicClaudeExecutionTools({
                isVerbose: true,
                apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
            }),
            new AzureOpenAiExecutionTools({
                isVerbose: true,
                resourceName: process.env.AZUREOPENAI_RESOURCE_NAME!,
                deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME!,
                apiKey: process.env.AZUREOPENAI_API_KEY!,
            }),
            // TODO: [🦻] Add langtail
        ],
        script: [new JavascriptExecutionTools()],
    };
    const llmTools = joinLlmExecutionTools(...tools.llm);

    /**/
    const models = await llmTools.listModels();
    console.info(llmTools.title, llmTools.description);
    console.info({ models });
    /**/

    /*/
    const prompt = {
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'COMPLETION',
        },
    } as const;
    const promptResult = await executionTools.callCompletionModel(prompt);
    console.info({ promptResult });
    console.info(chalk.green(prompt.content + promptResult.content));
    /**/

    /*/
    const prompt = {
        title: 'A chat',
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            // modelName: 'foo',
            modelVariant: 'CHAT',
        },
        pipelineUrl: '',
        parameters: {},
    } as const;
    const promptResult = await executionTools.callChatModel(prompt);
    console.info({ promptResult });
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Completion: ') + chalk.green(promptResult.content));
    /**/

    /*/
    // TODO: Test Translations in playground
    /**/

    /**/
    const prompt = {
        title: 'Embedding Prompt',
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'EMBEDDING',
            // modelName: 'text-embedding-ada-002',
        },
        pipelineUrl: '',
        parameters: {},
    } as const;
    const promptResult = await llmTools.callEmbeddingModel(prompt);
    console.info({ promptResult });
    console.info(chalk.bgBlue(' User: ') + chalk.blue(prompt.content));
    console.info(chalk.bgGreen(' Embedding: ') + chalk.green(embeddingVectorToString(promptResult.content)));
    /**/

    /*/
    // <- Note: [🤖] Test here new model variant if needed
    /**/

    //========================================/
}
