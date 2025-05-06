import spaceTrim from 'spacetrim';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { UnexpectedError } from '../../../errors/UnexpectedError';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { MultipleLlmExecutionTools } from '../../multiple/MultipleLlmExecutionTools';
import { $llmToolsMetadataRegister } from './$llmToolsMetadataRegister';
import { $provideLlmToolsConfigurationFromEnv } from './$provideLlmToolsConfigurationFromEnv';
import { $registeredLlmToolsMessage } from './$registeredLlmToolsMessage';
import type { CreateLlmToolsFromConfigurationOptions } from './createLlmToolsFromConfiguration';
import { createLlmToolsFromConfiguration } from './createLlmToolsFromConfiguration';

/**
 * Automatically configures LLM tools from environment variables in Node.js
 *
 * This utility function detects available LLM providers based on environment variables
 * and creates properly configured LLM execution tools for each detected provider.
 *
 * Note: This function is not cached, every call creates new instance of `MultipleLlmExecutionTools`
 *
 * Supports environment variables from .env files when dotenv is configured
 * Note: `$` is used to indicate that this function is not a pure function - it uses filesystem to access `.env` file
 *
 * It looks for environment variables:
 * - `process.env.OPENAI_API_KEY`
 * - `process.env.ANTHROPIC_CLAUDE_API_KEY`
 * - ...
 *
 * @param options Configuration options for the LLM tools
 * @returns A unified interface containing all detected and configured LLM tools
 * @public exported from `@promptbook/node`
 */
export async function $provideLlmToolsFromEnv(
    options: CreateLlmToolsFromConfigurationOptions = {},
): Promise<MultipleLlmExecutionTools> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideLlmToolsFromEnv` works only in Node.js environment');
    }

    const configuration = await $provideLlmToolsConfigurationFromEnv();

    if (configuration.length === 0) {
        if ($llmToolsMetadataRegister.list().length === 0) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                        No LLM tools registered, this is probably a bug in the Promptbook library

                        ${block($registeredLlmToolsMessage())}}
                    `,
                ),
            );
        }

        // TODO: [🥃]
        throw new Error(
            spaceTrim(
                (block) => `
                    No LLM tools found in the environment

                    ${block($registeredLlmToolsMessage())}}
                `,
            ),
        );
    }

    return createLlmToolsFromConfiguration(configuration, options);
}

/**
 * TODO: The architecture for LLM tools configuration consists of three key functions:
 * 1. `$provideLlmToolsFromEnv` - High-level function that detects available providers from env vars and returns ready-to-use LLM tools
 * 2. `$provideLlmToolsConfigurationFromEnv` - Middle layer that extracts configuration objects from environment variables
 * 3. `createLlmToolsFromConfiguration` - Low-level function that instantiates LLM tools from explicit configuration
 *
 * This layered approach allows flexibility in how tools are configured:
 * - Use $provideLlmToolsFromEnv for automatic detection and setup in Node.js environments
 * - Use $provideLlmToolsConfigurationFromEnv to extract config objects for modification before instantiation
 * - Use createLlmToolsFromConfiguration for explicit control over tool configurations
 *
 * TODO: [🧠][🍛] Which name is better `$provideLlmToolsFromEnv` or `$provideLlmToolsFromEnvironment`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [🥃] Allow `ptbk make` without llm tools
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [®] DRY Register logic
 */
