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
 * @@@
 *
 * Note: This function is not cached, every call creates new instance of `MultipleLlmExecutionTools`
 *
 * @@@ .env
 *
 * It looks for environment variables:
 * - `process.env.OPENAI_API_KEY`
 * - `process.env.ANTHROPIC_CLAUDE_API_KEY`
 * - ...
 *
 * @returns @@@
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
 * TODO: @@@ write `$provideLlmToolsFromEnv` vs `$provideLlmToolsConfigurationFromEnv` vs `createLlmToolsFromConfiguration`
 * TODO: [🧠][🍛] Which name is better `$provideLlmToolsFromEnv` or `$provideLlmToolsFromEnvironment`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [🥃] Allow `ptbk make` without llm tools
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [®] DRY Register logic
 */
