import { $Register } from '../../../utils/$Register';
import type { LlmToolsMetadata } from './LlmToolsMetadata';

/**
 * Register for LLM tools metadata.
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but there can be more instances across different builds or environments.
 * @public exported from `@promptbook/core`
 */
export const $llmToolsMetadataRegister = new $Register<LlmToolsMetadata>('llm_tools_metadata');

/**
 * TODO: [®] DRY Register logic
 */
