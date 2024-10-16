import * as dotenv from 'dotenv';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { string_name } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { $llmToolsMetadataRegister } from './$llmToolsMetadataRegister';
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
export function $provideLlmToolsConfigurationFromEnv(): LlmToolsConfiguration {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideLlmToolsFromEnv` works only in Node.js environment');
    }

    dotenv.config();

    const llmToolsConfiguration: LlmToolsConfiguration = $llmToolsMetadataRegister
        .list()
        .map((metadata) => metadata.createConfigurationFromEnv(process.env as Record<string_name, string>))
        .filter((configuration): configuration is LlmToolsConfiguration[number] => configuration !== null);

    return llmToolsConfiguration;
}

/**
 * TODO: [🧠][🪁] Maybe do allow to do auto-install if package not registered and not found
 * TODO: Add Azure OpenAI
 * TODO: [🧠][🍛]
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * Note: [🟢] Code in this file should never be published outside of `@promptbook/node` and `@promptbook/cli`
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [🧠] Maybe pass env as argument
 * TODO: [®] DRY Register logic */
