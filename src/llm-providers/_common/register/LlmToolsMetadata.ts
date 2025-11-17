import { MODEL_ORDERS, MODEL_TRUST_LEVELS } from '../../../constants';
import type { string_name, string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/misc/$Register';
import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * Metadata definition for LLM execution tools that provides information about a provider's capabilities,
 * configuration options, and relationships within the registry system.
 *
 * The Promptbook LLM tools architecture involves several related types:
 * - `LlmToolsMetadata`: Contains static metadata about the tool, such as name, version, and capabilities
 * - `LlmToolsConfiguration`: Runtime configuration from environment variables or settings
 * - `LlmToolsOptions`: Provider-specific options for instantiating tools
 * - `Registered`: The record of a registered tool in the global registry
 */
export type LlmToolsMetadata = Registered & {
    /**
     * Human-readable display name for the LLM provider
     * Used in UI components and documentation references
     */
    readonly title: string_title;

    /**
     * How is the model is trusted?
     */
    readonly trustLevel: keyof typeof MODEL_TRUST_LEVELS;

    /**
     * How is the model provider important and should be sorted in the list of available providers?
     */
    readonly order: (typeof MODEL_ORDERS)[keyof typeof MODEL_ORDERS] | number;

    /**
     * List of environment variables that can be used to configure the provider
     *
     * If `[]`, empty array, it means that the provider is available automatically without any configuration
     * If `null`, it means that the provider can not be configured via environment variables
     */
    readonly envVariables: ReadonlyArray<string_name & string_SCREAMING_CASE> | null;

    /**
     * Provides a default configuration template for this LLM provider
     * Used to generate example configurations or as fallback when no specific configuration is provided
     * @returns A standardized configuration object for this LLM provider
     */
    getBoilerplateConfiguration(): LlmToolsConfiguration[number];

    /**
     * Creates a provider-specific configuration object from environment variables
     * Used to automatically configure LLM tools based on available environment settings
     *
     * @param env Dictionary of environment variables (key-value pairs)
     * @returns Configuration object for this LLM provider if required variables are present, or null if configuration is not possible
     */
    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null;
};

/**
 * TODO: [🕛] Extend this
 * TODO: Add configuration schema and maybe some documentation link
 * TODO: Maybe constrain LlmToolsConfiguration[number] by generic to ensure that `createConfigurationFromEnv` and `getBoilerplateConfiguration` always create same `packageName` and `className`
 * TODO: [®] DRY Register logic
 */
