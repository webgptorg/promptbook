import spaceTrim from 'spacetrim';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { MultipleLlmExecutionTools } from '../../multiple/MultipleLlmExecutionTools';
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
 *
 * @returns @@@
 * @public exported from `@promptbook/node`
 */
export function $provideLlmToolsFromEnv(
    options: CreateLlmToolsFromConfigurationOptions = {},
): MultipleLlmExecutionTools {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideLlmToolsFromEnv` works only in Node.js environment');
    }

    const configuration = $provideLlmToolsConfigurationFromEnv();

    if (configuration.length === 0) {
        // TODO: [🥃]
        throw new Error(
            spaceTrim(
                (block) => `
                    No LLM tools found in the environment

                    Please set one of environment variables:
                    - OPENAI_API_KEY
                    - ANTHROPIC_CLAUDE_API_KEY

                    ${block($registeredLlmToolsMessage())}}
                `,
                // <- TODO: [main] !!! List environment keys dynamically
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
