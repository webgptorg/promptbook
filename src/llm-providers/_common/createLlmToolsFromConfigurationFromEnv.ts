import * as dotenv from 'dotenv';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * @@@
 *
 * @@@ .env
 *
 * It looks for environment variables:
 * - `process.env.OPENAI_API_KEY`
 * - `process.env.ANTHROPIC_CLAUDE_API_KEY`
 *
 * @returns @@@
 * @public exported from `@promptbook/node`
 */
export function createLlmToolsFromConfigurationFromEnv(): LlmToolsConfiguration {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `createLlmToolsFromEnv` works only in Node.js environment');
    }

    dotenv.config();

    const llmToolsConfiguration: LlmToolsConfiguration = [];

    if (typeof process.env.OPENAI_API_KEY === 'string') {
        llmToolsConfiguration.push({
            title: 'OpenAI (from env)',
            packageName: '@promptbook/openai',
            className: 'OpenAiExecutionTools',
            options: {
                apiKey: process.env.OPENAI_API_KEY!,
            },
        });
    }

    if (typeof process.env.ANTHROPIC_CLAUDE_API_KEY === 'string') {
        llmToolsConfiguration.push({
            title: 'Claude (from env)',
            packageName: '@promptbook/antrhopic-claude',
            className: 'AnthropicClaudeExecutionTools',
            options: {
                apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
            },
        });
    }

    // <- Note: [🦑] Add here new LLM provider

    return llmToolsConfiguration;
}

/**
 * TODO: Add Azure OpenAI
 * TODO: [🧠][🍛]
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * Note: [🟢] This code should never be published outside of `@promptbook/node` and `@promptbook/cli` and `@promptbook/cli`
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [🧠] Maybe pass env as argument
 */
