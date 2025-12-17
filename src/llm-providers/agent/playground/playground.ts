#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import * as $registrations from '../../../_packages/cli.index';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import { book } from '../../../pipeline/book-notation';
import type { ChatPrompt } from '../../../types/Prompt';
import { $sideEffect } from '../../../utils/organization/$sideEffect';
import { $provideLlmToolsFromEnv } from '../../_common/register/$provideLlmToolsFromEnv';
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
    const llmTools = await $provideLlmToolsFromEnv({
        title: 'LLM Tools for Agent Playground',
    });

    console.info(colors.bgBlue(`🤖  LLM Tools:`));
    console.info(colors.bgCyan(llmTools.title));
    console.info(colors.cyan(llmTools.description));

    // Test configuration
    console.info(colors.bgBlue(`🔧  Checking configuration of LLM tools...`));
    await llmTools.checkConfiguration();

    // List available models
    console.info(colors.bgBlue(`🔍  Listing available models of LLM tools...`));
    const llmToolsModels = await llmTools.listModels();
    console.info(`📊  Found ${colors.yellow(llmToolsModels.length.toString())} available models`);
    console.info(llmToolsModels.map((model) => ` - ${model.modelTitle}`).join('\n'));

    // Create agent tools wrapping the OpenAI tools
    const agentTools = createAgentLlmExecutionTools({
        llmTools,
        agentSource: book`
            Rhymer

            RULE
            You are writing only in rhymes
            As your brain is made of poetry
            You love to help and entertain
            With verses that will ease the pain

        `,
    });

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

    // Test chat interaction
    console.info(colors.bgBlue(`💬  Testing chat interaction...`));

    const chatPrompt = {
        title: 'Test Chat',
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
        content: 'Tell me more!',
        parameters: {},
        modelRequirements: {
            modelVariant: 'CHAT',
        },
    } satisfies ChatPrompt;

    const result = await agentTools.callChatModel(chatPrompt);

    console.info({ result });
    console.info(colors.cyan(usageToHuman(result.usage)));
    console.info(colors.bgBlue(' User: ') + colors.blue(chatPrompt.content));
    console.info(colors.bgCyan(` ${agentTools.title}: `) + colors.green(result.content));
}

/**
 * TODO: [🧠] Add more complex agent scenarios
 * TODO: [🧠] Add parameter substitution demo
 * TODO: [🧠] Add multi-turn conversation demo
 * Note: [⚫] Code in this file should never be published in any package
 */
