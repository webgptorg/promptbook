import { MODEL_ORDERS, MODEL_TRUST_LEVELS } from '../../constants';
import type { LlmToolsConfiguration } from '../_common/register/LlmToolsConfiguration';
import { $llmToolsMetadataRegister } from '../_common/register/$llmToolsMetadataRegister';

/**
 * Metadata for Agent LLM execution tools
 *
 * @public exported from `@promptbook/core`
 */
export const _AgentMetadata = $llmToolsMetadataRegister.register({
    packageName: '@promptbook/core',
    className: 'AgentLlmExecutionTools',
    title: 'Agent',
    trustLevel: 'UNTRUSTED' as keyof typeof MODEL_TRUST_LEVELS, // Note: This is a wrapper, trust depends on underlying tools
    order: MODEL_ORDERS.LOW_TIER, // Wrapper tools have lower priority
    envVariables: null, // Cannot be configured via environment variables as it requires other LLM tools and agent source

    getBoilerplateConfiguration(): LlmToolsConfiguration[number] {
        return {
            packageName: '@promptbook/core',
            className: 'AgentLlmExecutionTools',
            title: 'Agent',
            options: {
                // Note: Agent tools require runtime configuration with underlying tools and agent source
                // This cannot be provided as a static configuration
            },
        };
    },

    createConfigurationFromEnv(): LlmToolsConfiguration[number] | null {
        // Agent tools cannot be configured from environment variables alone
        // They require underlying LLM tools and agent source to be provided programmatically
        return null;
    },
});

/**
 * TODO: [🧠] Consider adding a special trust level for wrapper tools
 * TODO: [🧠] Consider how to handle configuration for wrapper tools that depend on other tools
 */
