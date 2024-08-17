import { TODO_any } from '../_packages/types.index';
import { Registered } from '../utils/Register';
import { LlmExecutionTools } from './LlmExecutionTools';

/**
 * @@@
 */
export type LlmExecutionToolsConstructor = Registered & ((options: TODO_any) => LlmExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
