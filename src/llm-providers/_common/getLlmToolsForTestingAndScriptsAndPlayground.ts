import { join } from 'path';
import { DEBUG_ALLOW_PAYED_TESTING } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { FilesStorage } from '../../storage/files-storage/FilesStorage';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import type { CreateLlmToolsFromEnvOptions } from './createLlmToolsFromEnv';
import { createLlmToolsFromEnv } from './createLlmToolsFromEnv';
import { cacheLlmTools } from './utils/cache/cacheLlmTools';
import { countTotalUsage } from './utils/count-total-cost/countTotalCost';
import { limitTotalCost } from './utils/count-total-cost/limitTotalCost';
import type { LlmExecutionToolsWithTotalCost } from './utils/count-total-cost/LlmExecutionToolsWithTotalCost';

/**
 * Returns LLM tools for testing purposes
 *
 * @private within the repository - JUST FOR TESTS, SCRIPTS AND PLAYGROUND
 */
export function getLlmToolsForTestingAndScriptsAndPlayground(
    options?: CreateLlmToolsFromEnvOptions,
): LlmExecutionToolsWithTotalCost {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const llmTools: LlmExecutionTools = createLlmToolsFromEnv(options);
    const llmToolsWithUsage = DEBUG_ALLOW_PAYED_TESTING
        ? countTotalUsage(llmTools)
        : //    <- Note: for example here we don`t want the [🌯]
          limitTotalCost(llmTools);
    //          <- Note: for example here we don`t want the [🌯]

    return cacheLlmTools(llmToolsWithUsage, {
        storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), '/executions-cache') }),
    });
}

/**
 * Note: [⚪] This should never be in any released package
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
