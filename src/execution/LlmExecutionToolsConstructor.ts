import type { Registered } from '../utils/misc/$Register';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { LlmExecutionTools } from './LlmExecutionTools';

/**
 * Type representing a constructor for LLM execution tools, which are used to interact with language models.
 * Combines registration metadata with a factory function for creating LLM tool instances.
 */
export type LlmExecutionToolsConstructor = Registered & ((options: TODO_any) => LlmExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
