import spaceTrim from 'spacetrim';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { AnthropicClaudeExecutionTools } from '../anthropic-claude/AnthropicClaudeExecutionTools';
import { joinLlmExecutionTools } from '../multiple/joinLlmExecutionTools';
import { OpenAiExecutionTools } from '../openai/OpenAiExecutionTools';

/**
 * @@@
 *
 * Note: This function is not cached, every call creates new instance of LlmExecutionTools
 *
 * It looks for environment variables:
 * - `process.env.OPENAI_API_KEY`
 * - `process.env.ANTHROPIC_CLAUDE_API_KEY`
 *
 * @returns @@@
 */
export function createLlmToolsFromEnv(): LlmExecutionTools {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `createLlmToolsFromEnv` works only in Node.js environment');
    }

    const llmTools: Array<LlmExecutionTools> = [];

    if (typeof process.env.OPENAI_API_KEY === 'string') {
        llmTools.push(
            new OpenAiExecutionTools({
                isVerbose: true,
                apiKey: process.env.OPENAI_API_KEY!,
            }),
        );
    }

    if (typeof process.env.ANTHROPIC_CLAUDE_API_KEY === 'string') {
        llmTools.push(
            new AnthropicClaudeExecutionTools({
                isVerbose: true,
                apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
            }),
        );
    }

    if (llmTools.length === 0) {
        throw new Error(
            spaceTrim(`
                No LLM tools found in the environment

                Please set one of environment variables:
                - OPENAI_API_KEY
                - ANTHROPIC_CLAUDE_API_KEY
            `),
        );
    } else if (llmTools.length === 1) {
        return llmTools[0]!;
    } else {
        return joinLlmExecutionTools(...llmTools);
    }
}

/**
 * TODO: [🔼] Export this util
 * TODO: @@@ write discussion about this - wizzard
 * TODO: Add Azure
 * TODO: [🧠] Which name is better `createLlmToolsFromEnv` or `createLlmToolsFromEnvironment`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [🧠] Maybe pass env as argument
 */
