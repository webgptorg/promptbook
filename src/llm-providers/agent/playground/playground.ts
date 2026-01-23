#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import * as $registrations from '../../../_packages/cli.index';
import { getAllCommitmentsToolFunctionsForNode } from '../../../commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { DEFAULT_EXECUTION_CACHE_DIRNAME } from '../../../config';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import { book } from '../../../pipeline/book-notation';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { JavascriptExecutionTools } from '../../../scripting/javascript/JavascriptExecutionTools';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import type { ChatPrompt } from '../../../types/Prompt';
import { $sideEffect } from '../../../utils/organization/$sideEffect';
import { just } from '../../../utils/organization/just';
import { keepImported } from '../../../utils/organization/keepImported';
import { cacheLlmTools } from '../../_common/utils/cache/cacheLlmTools';
import { OpenAiAssistantExecutionTools } from '../../openai/OpenAiAssistantExecutionTools';
import { createAgentLlmExecutionTools } from '../createAgentLlmExecutionTools';

$sideEffect($registrations); // <- Note: LLM Providers are registered by importing their registration files

/**
 * Main function demonstrating AgentLlmExecutionTools usage
 */
playground()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Demo AgentLlmExecutionTools in a chat scenario
 */
async function playground() {
    // Create underlying OpenAI tools

    const nonce = '(0)';
    const isVerbose = true;

    /*/
    const llmTools = await $provideLlmToolsFromEnv({
        title: 'LLM Tools for Agent Playground',
    });
     /**/

    /**/
    const llmTools = new OpenAiAssistantExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
        assistantId: 'abstract_assistant', // <- TODO: [🙎] In `OpenAiAssistantExecutionTools` Allow to create abstract assistants with `isCreatingNewAssistantsAllowed`
        executionTools: {
            script: new JavascriptExecutionTools({
                isVerbose,
                functions: getAllCommitmentsToolFunctionsForNode(),
            }),
        },
        isCreatingNewAssistantsAllowed: true,
        isVerbose,
    });
    /**/

    /*/
    console.info(colors.bgBlue(`🤖  LLM Tools:`));
    console.info(colors.bgCyan(llmTools.title));
    console.info(colors.cyan(llmTools.description));
    /**/

    /*/
    // Test configuration
    console.info(colors.bgBlue(`🔧  Checking configuration of LLM tools...`));
    await llmTools.checkConfiguration();
    /**/

    /*/
    // List available models
    console.info(colors.bgBlue(`🔍  Listing available models of LLM tools...`));
    const llmToolsModels = await llmTools.listModels();
    console.info(`📊  Found ${colors.yellow(llmToolsModels.length.toString())} available models`);
    console.info(llmToolsModels.map((model) => ` - ${model.modelTitle}`).join('\n'));
    /**/

    // Create agent tools wrapping the OpenAI tools
    let agentTools = createAgentLlmExecutionTools({
        llmTools,
        agentSource: book`
            Testing time from agent playground

            FROM VOID
            PERSONA You are an assistant that can determine the current date and time. ${nonce}
            RULE Reply in language and date and time format as per the user's locale and language.
            RULE Prefer words instead of digits when expressing time, for example, say "half past three" instead of "3:30".
            USE TIME

        `,
        // agentSource: book`
        //     Paul
        //
        //     FROM VOID
        //     RULE You are writing about news in AI and technology.
        //     USE SEARCH
        //
        // `,
        // <- TODO: !!!! Test `USE BROWSER`
    });

    agentTools = just(agentTools);
    keepImported(cacheLlmTools, FileCacheStorage, $provideFilesystemForNode, join, DEFAULT_EXECUTION_CACHE_DIRNAME);

    /**/
    agentTools = cacheLlmTools(agentTools, {
        storage: new FileCacheStorage(
            { fs: $provideFilesystemForNode() },
            {
                rootFolderPath: join(
                    process.cwd(),
                    DEFAULT_EXECUTION_CACHE_DIRNAME,
                    // <- TODO: [🦒] Allow to override (pass different value into the function)
                ),
            },
        ),
        // isCacheReloaded: isCacheReloaded,
    });
    /**/

    console.info(colors.bgBlue(`🧔  Agent Tools:`));
    console.info(colors.bgCyan(agentTools.title));
    console.info(colors.cyan(agentTools.description));

    // Test configuration
    console.info(colors.bgBlue(`🔧  Checking configuration of agent tools...`));
    await agentTools.checkConfiguration();

    // List available models
    console.info(colors.bgBlue(`🔍  Listing available models of agent tools...`));
    const models = await agentTools.listModels();
    console.info(`📊  Found ${colors.yellow(models.length.toString())} available models`);
    console.info(models.map((model) => ` - ${model.modelTitle}`).join('\n'));

    // Show the model requirements
    console.info(colors.bgBlue(`🔣  Model Requirements:`));
    const modelRequirements = await agentTools.getModelRequirements();
    console.info(modelRequirements);

    // Test chat interaction
    console.info(colors.bgBlue(`💬  Chatting with agent...`));

    const chatPrompt = {
        title: 'Test Chat',
        /*
        thread: [
            // <- TODO: !!! Maybe rename to `previousMessages`
            {
                // channel: 'PROMPTBOOK_CHAT',
                // id: 'msg1',
                sender: 'user', // <- TODO: [👥] Standardize to `role: 'USER' | 'ASSISTANT'
                content: 'Hello! Can you tell me a fun fact about TypeScript?',
            },
            {
                // channel: 'PROMPTBOOK_CHAT',
                // id: 'msg2',
                sender: 'assistant',
                content: 'TypeScript is a superset of JavaScript that adds static types.',
            },
        ],
        */
        content: 'Kolik je hodin?' + nonce,
        parameters: {},
        modelRequirements: {
            modelVariant: 'CHAT',
        },
    } satisfies ChatPrompt;

    const result = await agentTools.callChatModel(chatPrompt);

    console.info({ result });
    console.info(colors.cyan(usageToHuman(result.usage)));
    console.info(colors.bgBlue(' User: ') + '\n' + colors.blue(chatPrompt.content));
    console.info(colors.bgCyan(` ${agentTools.title}: `) + '\n' + colors.green(result.content));
}

/**
 * TODO: [🧠] Add more complex agent scenarios
 * TODO: [🧠] Add parameter substitution demo
 * TODO: [🧠] Add multi-turn conversation demo
 * Note: [⚫] Code in this file should never be published in any package
 */
