import { join } from 'path';
import { EXECUTIONS_CACHE_DIRNAME } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { FilesStorage } from '../../storage/files-storage/FilesStorage';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { createLlmToolsFromEnv } from './createLlmToolsFromEnv';
import { cacheLlmTools } from './utils/cache/cacheLlmTools';
import { countTotalUsage } from './utils/count-total-cost/countTotalCost';
import type { LlmExecutionToolsWithTotalCost } from './utils/count-total-cost/LlmExecutionToolsWithTotalCost';

/**
 * Returns LLM tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export function getLlmToolsForCli(): LlmExecutionToolsWithTotalCost {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    return cacheLlmTools(
        countTotalUsage(
            //        <- Note: for example here we don`t want the [🌯]
            createLlmToolsFromEnv(),
        ),
        {
            storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), EXECUTIONS_CACHE_DIRNAME) }),
        },
    );
}

/**
 * Note: [🟡] This code should never be published outside of `@promptbook/cli`
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
