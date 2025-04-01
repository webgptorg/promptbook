import * as dotenv from 'dotenv';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { string_name } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { $llmToolsMetadataRegister } from './$llmToolsMetadataRegister';
import { $provideEnvFilepath } from './$provideEnvFilepath';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * @@@
 *
 * @@@ .env
 * Note: `$` is used to indicate that this function is not a pure function - it uses filesystem to access .env file
 *
 * It looks for environment variables:
 * - `process.env.OPENAI_API_KEY`
 * - `process.env.ANTHROPIC_CLAUDE_API_KEY`
 * - ...
 *
 * @returns @@@
 * @public exported from `@promptbook/node`
 */
export async function $provideLlmToolsConfigurationFromEnv(): Promise<LlmToolsConfiguration> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideLlmToolsFromEnv` works only in Node.js environment');
    }

    const envFilepath = await $provideEnvFilepath();

    if (envFilepath !== null) {
        dotenv.config({ path: envFilepath });
    }

    const llmToolsConfiguration: LlmToolsConfiguration = $llmToolsMetadataRegister
        .list()
        .map((metadata) => metadata.createConfigurationFromEnv(process.env as Record<string_name, string>))
        .filter((configuration): configuration is LlmToolsConfiguration[number] => configuration !== null);

    return llmToolsConfiguration;
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
