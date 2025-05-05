import * as dotenv from 'dotenv';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { string_name } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { $llmToolsMetadataRegister } from './$llmToolsMetadataRegister';
import { $provideEnvFilename } from './$provideEnvFilename';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * Provides LLM tools configuration by reading environment variables.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it uses filesystem to access `.env` file
 *
 * It looks for environment variables:
 * - `process.env.OPENAI_API_KEY`
 * - `process.env.ANTHROPIC_CLAUDE_API_KEY`
 * - ...
 *
 * @see Environment variables documentation or .env file for required variables.
 * @returns A promise that resolves to the LLM tools configuration, or null if configuration is incomplete or missing.
 * @public exported from `@promptbook/node`
 */
export async function $provideLlmToolsConfigurationFromEnv(): Promise<LlmToolsConfiguration> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideLlmToolsFromEnv` works only in Node.js environment');
    }

    const envFilepath = await $provideEnvFilename();

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