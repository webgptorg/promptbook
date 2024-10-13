import spaceTrim from 'spacetrim';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { MultipleLlmExecutionTools } from '../../multiple/MultipleLlmExecutionTools';
import { $registeredScrapersMessage } from './$registeredScrapersMessage';
import type { CreateScrapersFromConfigurationOptions } from './createScrapersFromConfiguration';
import { createScrapersFromConfiguration } from './createScrapersFromConfiguration';
import { createScrapersFromConfigurationFromEnv } from './createScrapersFromConfigurationFromEnv';

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
export function createScrapersFromEnv(options: CreateScrapersFromConfigurationOptions = {}): MultipleLlmExecutionTools {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `createScrapersFromEnv` works only in Node.js environment');
    }

    const configuration = createScrapersFromConfigurationFromEnv();

    if (configuration.length === 0) {
        // TODO: [🥃]
        throw new Error(
            spaceTrim(
                (block) => `
                    No LLM tools found in the environment

                    Please set one of environment variables:
                    - OPENAI_API_KEY
                    - ANTHROPIC_CLAUDE_API_KEY

                    ${block($registeredScrapersMessage())}}
                `,
                // <- TODO: [main] !!! List environment keys dynamically
            ),
        );
    }

    return createScrapersFromConfiguration(configuration, options);
}

/**
 * TODO: @@@ write `createScrapersFromEnv` vs `createScrapersFromConfigurationFromEnv` vs `createScrapersFromConfiguration`
 * TODO: [🧠][🍛] Which name is better `createScrapersFromEnv` or `createScrapersFromEnvironment`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * Note: [🟢] Code in this file should never be published outside of `@promptbook/node` and `@promptbook/cli`
 * TODO: [🥃] Allow `ptbk make` without scrapers
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [®] DRY Register logic
 */
