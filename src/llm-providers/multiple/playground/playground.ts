#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { embeddingVectorToString } from '../../../execution/embeddingVectorToString';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import { JavascriptExecutionTools } from '../../../scripting/javascript/JavascriptExecutionTools';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { AnthropicClaudeExecutionTools } from '../../anthropic-claude/AnthropicClaudeExecutionTools';
import { AzureOpenAiExecutionTools } from '../../azure-openai/AzureOpenAiExecutionTools';
import { OpenAiExecutionTools } from '../../openai/OpenAiExecutionTools';
import { joinLlmExecutionTools } from '../joinLlmExecutionTools';

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
    console.info(`🧸  Multiple LLMs Playground`);

    // Do here stuff you want to test
    //========================================>

    const tools = {
        llm: [
            new OpenAiExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                    apiKey: process.env.OPENAI_API_KEY!,
                },
            ),
            new AnthropicClaudeExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                    apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
                },
            ),
            new AzureOpenAiExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                    resourceName: process.env.AZUREOPENAI_RESOURCE_NAME!,
                    deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME!,
                    apiKey: process.env.AZUREOPENAI_API_KEY!,
                },
            ),
            // TODO: [🦻] Add langtail
        ],
        script: [
            new JavascriptExecutionTools(),
            //            <- TODO: [🧱] Implement in a functional (not new Class) way
        ],
    };
    const llmTools = joinLlmExecutionTools(...tools.llm);

    keepUnused(llmTools);
    keepUnused(embeddingVectorToString);
    keepUnused(usageToHuman);
    keepUnused<Prompt>();

    /*/
    const models = await llmTools.listModels();
    console.info(llmTools.title, llmTools.description);
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
    const completionPromptResult = await llmTools.callCompletionModel(completionPrompt);
    console.info({ completionPromptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(chalk.green(completionPrompt.content + completionPromptResult.content));
    /**/

    /*/
    const chatPrompt = {
        title: 'Hello',
        parameters: {},
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            // modelName: 'foo',
            modelVariant: 'CHAT',
        },
    } as const satisfies Prompt;
    const chatPromptResult = await llmTools.callChatModel(chatPrompt);
    console.info({ chatPromptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(chalk.bgBlue(' User: ') + chalk.blue(chatPrompt.content));
    console.info(chalk.bgGreen(' Completion: ') + chalk.green(chatPromptResult.content));
    /**/

    /*/
    // TODO: Test Translations in playground
    /**/

    /*/
    const prompt = {
        title: 'Embedding Prompt',
        parameters: {},
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'EMBEDDING',
            // modelName: 'text-embedding-ada-002',
        },
    } as const satisfies Prompt;
    const promptResult = await llmTools.callEmbeddingModel(prompt);
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
 * Note: [⚫] Code in this file should never be published in any package
 */
