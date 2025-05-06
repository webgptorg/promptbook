import type { string_name, string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * How is the model provider trusted?
 *
 * @public exported from `@promptbook/core`
 */
export const MODEL_TRUST_LEVEL = {
    FULL: `Model is running on the local machine, training data and model weights are known, data are ethically sourced`,
    OPEN: `Model is open source, training data and model weights are known`,
    PARTIALLY_OPEN: `Model is open source, but training data and model weights are not (fully) known`,
    CLOSED_LOCAL: `Model can be run locally, but it is not open source`,
    CLOSED_FREE: `Model is behind API gateway but free to use`,
    CLOSED_BUSINESS: `Model is behind API gateway and paid but has good SLA, TOS, privacy policy and in general is a good to use in business applications`,
    CLOSED: `Model is behind API gateway and paid`,
    UNTRUSTED: `Model has questions about the training data and ethics, but it is not known if it is a problem or not`,
    VURNABLE: `Model has some known serious vulnerabilities, leaks, ethical problems, etc.`,
} as const satisfies Record<string_name, string_name>;
// <- TODO: Maybe do better levels of trust

/**
 * How is the model provider important?
 *
 * @public exported from `@promptbook/core`
 */
export const MODEL_ORDER = {
    /**
     * Top-tier models, e.g. OpenAI, Anthropic,...
     */
    TOP_TIER: 333,

    /**
     * Mid-tier models, e.g. Llama, Mistral, etc.
     */
    NORMAL: 100,

    /**
     * Low-tier models, e.g. Phi, Tiny, etc.
     */
    LOW_TIER: 0,
} as const satisfies Record<string_name, number>;

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
    readonly trustLevel: keyof typeof MODEL_TRUST_LEVEL;

    /**
     * How is the model provider important and should be sorted in the list of available providers?
     */
    readonly order: typeof MODEL_ORDER[keyof typeof MODEL_ORDER] | number;

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
 * TODO: Add configuration schema and maybe some documentation link
 * TODO: Maybe constrain LlmToolsConfiguration[number] by generic to ensure that `createConfigurationFromEnv` and `getBoilerplateConfiguration` always create same `packageName` and `className`
 * TODO: [®] DRY Register logic
 */
