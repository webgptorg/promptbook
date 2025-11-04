#!/usr/bin/env ts-node

/*
This example demonstrates how to use OpenAiCompatibleExecutionTools with a custom baseURL
to connect to any OpenAI-compatible LLM service.

Note: [🔁] In your app you will be importing '@promptbook/openai' instead of '../../../src/_packages/openai.index'
*/

import * as dotenv from 'dotenv';
import { basename } from 'path';
import colors from 'yoctocolors';
import { createOpenAiCompatibleExecutionTools } from '../../../src/_packages/openai.index';
import { assertsError } from '../../../src/errors/assertsError';

if (process.cwd().split(/[\\/]/).pop() !== 'promptbook') {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

dotenv.config({ path: '.env' });

main()
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function main() {
    console.info(colors.bgWhite('⚪ Testing OpenAI Compatible Execution Tools with custom baseURL'));

    // Example 1: Using with OpenAI (default)
    console.info(colors.bgBlue('📡 Example 1: OpenAI (default)'));
    const openaiTools = createOpenAiCompatibleExecutionTools({
        apiKey: process.env.OPENAI_API_KEY || 'sk-your-openai-api-key',
        baseURL: 'https://api.openai.com/v1', // This is the default OpenAI endpoint
        isVerbose: true,
    });

    console.info(`Title: ${openaiTools.title}`);
    console.info(`Description: ${openaiTools.description}`);

    // Example 2: Using with a local Ollama instance
    console.info(colors.bgBlue('📡 Example 2: Local Ollama'));
    const ollamaTools = createOpenAiCompatibleExecutionTools({
        apiKey: 'ollama', // Ollama doesn't require a real API key
        baseURL: 'http://localhost:11434/v1', // Local Ollama endpoint
        isVerbose: true,
    });

    console.info(`Title: ${ollamaTools.title}`);
    console.info(`Description: ${ollamaTools.description}`);

    // Example 3: Using with DeepSeek API
    console.info(colors.bgBlue('📡 Example 3: DeepSeek API'));
    const deepseekTools = createOpenAiCompatibleExecutionTools({
        apiKey: process.env.DEEPSEEK_API_KEY || 'sk-your-deepseek-api-key',
        baseURL: 'https://api.deepseek.com/v1', // DeepSeek endpoint
        isVerbose: true,
    });

    console.info(`Title: ${deepseekTools.title}`);
    console.info(`Description: ${deepseekTools.description}`);

    // Example 4: Using with environment variables
    console.info(colors.bgBlue('📡 Example 4: From Environment Variables'));
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_BASE_URL) {
        const envTools = createOpenAiCompatibleExecutionTools({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
            isVerbose: true,
        });

        console.info(`Title: ${envTools.title}`);
        console.info(`Description: ${envTools.description}`);
        console.info(`Using baseURL from env: ${process.env.OPENAI_BASE_URL}`);
    } else {
        console.info(
            colors.yellow('Set OPENAI_API_KEY and OPENAI_BASE_URL environment variables to test this example'),
        );
    }

    // Example 5: Using with proxied mode (for browser/remote usage)
    console.info(colors.bgBlue('📡 Example 5: Proxied Mode'));
    const proxiedTools = createOpenAiCompatibleExecutionTools({
        apiKey: 'sk-placeholder', // API key for proxied mode
        baseURL: 'https://api.openai.com/v1',
        isProxied: true,
        remoteServerUrl: 'https://your-promptbook-server.com',
        isVerbose: true,
    });

    console.info(`Title: ${proxiedTools.title}`);
    console.info(`Description: ${proxiedTools.description}`);
    console.info('This configuration uses a remote Promptbook server to proxy API calls');

    // Test basic functionality (if API key is available)
    if (process.env.OPENAI_API_KEY) {
        console.info(colors.bgGreen('🧪 Testing basic chat functionality'));

        try {
            const result = await openaiTools.callChatModel({
                title: 'Test OpenAI Compatible Tools',
                content: 'Say "Hello from OpenAI Compatible Tools!"',
                parameters: {},
                modelRequirements: {
                    modelVariant: 'CHAT',
                    modelName: 'gpt-3.5-turbo',
                },
                // format: 'JSON', // Optional - only use if you want JSON response
            });

            console.info(colors.green('✅ Chat model response:'), result.content);
            console.info(colors.cyan('Usage:'), result.usage);
        } catch (error) {
            assertsError(error);
            console.error(colors.red('❌ Error calling chat model:'), error.message);
        }
    } else {
        console.info(colors.yellow('Set OPENAI_API_KEY environment variable to test actual API calls'));
    }

    console.info(colors.bgGreen('✅ OpenAI Compatible Execution Tools examples completed'));
}

/**
 * Usage examples:
 *
 * 1. With OpenAI:
 *    OPENAI_API_KEY=sk-your-key npm run ts-node examples/usage/openai-compatible/openai-compatible-example.ts
 *
 * 2. With custom endpoint:
 *    OPENAI_API_KEY=your-key OPENAI_BASE_URL=https://your-endpoint.com/v1 npm run ts-node examples/usage/openai-compatible/openai-compatible-example.ts
 *
 * 3. With local Ollama:
 *    OPENAI_API_KEY=ollama OPENAI_BASE_URL=http://localhost:11434/v1 npm run ts-node examples/usage/openai-compatible/openai-compatible-example.ts
 */
