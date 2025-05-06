import type { string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
import type { LlmToolsOptions } from './LlmToolsOptions';

/**
 * Configuration definition for LLM execution tools, containing provider-specific settings
 * that can be passed during runtime to instantiate and configure LLM tools properly.
 *
 * The Promptbook LLM tools architecture involves several related types:
 * - `LlmToolsMetadata`: Contains static metadata about the tool, such as name, version, and capabilities
 * - `LlmToolsConfiguration`: Runtime configuration from environment variables or settings
 * - `LlmToolsOptions`: Provider-specific options for instantiating tools
 * - `Registered`: The record of a registered tool in the global registry
 */
export type LlmToolsConfiguration = ReadonlyArray<
    Registered & {
        /**
         * Human-readable name for this specific provider configuration
         * Used in UI components and logs for identifying this particular configuration
         */
        readonly title: string_title;

        /**
         * Provider-specific configuration options used for instantiating and configuring LLM tools
         * Contains values like API keys, model preferences, endpoint URLs, and other settings
         */
        readonly options: LlmToolsOptions;
    }
>;

/**
 * TODO: [🧠][🌰] `title` is redundant BUT maybe allow each provider pass it's own title for tracking purposes
 * TODO: Maybe instead of `LlmToolsConfiguration[number]` make `LlmToolsConfigurationItem`
 * TODO: [®] DRY Register logic
 */
