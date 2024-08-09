import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
/**
 * @privxxate <- TODO: !!!!!! Warn that not private or exported
 */
export type CreateLlmToolsFromEnvOptions = {
    /**
     * This will will be passed to the created `LlmExecutionTools`
     *
     * @default false
     */
    isVerbose?: boolean;
};
/**
 * @@@
 *
 * Note: This function is not cached, every call creates new instance of `LlmExecutionTools`
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
export declare function createLlmToolsFromEnv(options?: CreateLlmToolsFromEnvOptions): LlmExecutionTools;
/**
 * TODO: [🍜] Use `createLlmToolsFromConfiguration`
 * TODO: @@@ write discussion about this - wizzard
 * TODO: Add Azure
 * TODO: [🧠] Which name is better `createLlmToolsFromEnv` or `createLlmToolsFromEnvironment`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [🧠] Maybe pass env as argument
 * Note: [🟢] This code should never be published outside of `@promptbook/node`
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
