import spaceTrim from 'spacetrim';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { MultipleLlmExecutionTools } from '../../multiple/MultipleLlmExecutionTools';
import { $registeredLlmToolsMessage } from './$registeredLlmToolsMessage';
import type { CreateLlmToolsFromConfigurationOptions } from './createLlmToolsFromConfiguration';
import { createLlmToolsFromConfiguration } from './createLlmToolsFromConfiguration';
import { createLlmToolsFromConfigurationFromEnv } from './createLlmToolsFromConfigurationFromEnv';

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
export function createLlmToolsFromEnv(options: CreateLlmToolsFromConfigurationOptions = {}): MultipleLlmExecutionTools {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `createLlmToolsFromEnv` works only in Node.js environment');
    }

    const configuration = createLlmToolsFromConfigurationFromEnv();

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
 * TODO: @@@ write `createLlmToolsFromEnv` vs `createLlmToolsFromConfigurationFromEnv` vs `createLlmToolsFromConfiguration`
 * TODO: [🧠][🍛] Which name is better `createLlmToolsFromEnv` or `createLlmToolsFromEnvironment`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * Note: [🟢] Code in this file should never be published outside of `@promptbook/node` and `@promptbook/cli`
 * TODO: [🥃] Allow `ptbk make` without llm tools
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [®] DRY Register logic
 * TODO: [🍂] Maybe make llm = createLlmToolsFromEnv() without problem with bundle contaminated by only `@promptbook/node` and `@promptbook/cli` stuff
 */
