import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';

/**
 * @@@
 *
 * Note: This function is not cached, every call creates new instance of LlmExecutionTools
 *
 * @returns @@@
 */
export function createLlmToolsFromEnv(): LlmExecutionTools {
  throw new NotYetImplementedError('createLlmToolsFromEnv');
}

/**
 * TODO: !!!!! Export this util
 * TODO: !!!!! Use this for tests in promptbook project itself
 * TODO: !!!! write discussion about this and storages
 *            write how to combine multiple interceptors
 * TODO: [🧠] Which name is better `createLlmToolsFromEnv` or `createLlmToolsFromEnvironment`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [🧠] Maybe pass env as argument
 */
