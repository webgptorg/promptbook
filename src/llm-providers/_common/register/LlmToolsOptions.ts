import type { TODO_object } from '../../../utils/organization/TODO_object';

/**
 * Options for configuring LLM (Large Language Model) tools.
 *
 * This type is used to pass provider-specific options to LLM execution tools.
 *
 *
 * The Promptbook LLM tools architecture involves several related types:
 * - `LlmToolsMetadata`: Contains static metadata about the tool, such as name, version, and capabilities
 * - `LlmToolsConfiguration`: Runtime configuration from environment variables or settings
 * - `LlmToolsOptions`: Provider-specific options for instantiating tools
 * - `Registered`: The record of a registered tool in the global registry
 */
export type LlmToolsOptions = TODO_object;

/**
 * TODO: [®] DRY Register logic
 */
