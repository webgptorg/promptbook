import type { LlmToolsMetadata } from '../llm-providers/_common/register/LlmToolsMetadata';
import type { Registered } from '../utils/$Register';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { LlmExecutionTools } from './LlmExecutionTools';

/**
 * @@@
 */
export type LlmExecutionToolsConstructor = Registered &
    Pick<LlmToolsMetadata, 'title'> &
    ((options: TODO_any) => LlmExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
