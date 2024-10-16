import { join } from 'path';
import { EXECUTIONS_CACHE_DIRNAME } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { $provideLlmToolsFromEnv } from './$provideLlmToolsFromEnv';
import { cacheLlmTools } from './utils/cache/cacheLlmTools';
import { countTotalUsage } from './utils/count-total-usage/countTotalUsage';
import type { LlmExecutionToolsWithTotalUsage } from './utils/count-total-usage/LlmExecutionToolsWithTotalUsage';

type GetLlmToolsForCliOptions = {
    /**
     * @@@
     *
     * @default false
     */
    isCacheReloaded?: boolean;
};

/**
 * Returns LLM tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export function getLlmToolsForCli(options?: GetLlmToolsForCliOptions): LlmExecutionToolsWithTotalUsage {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const { isCacheReloaded = false } = options ?? {};

    return cacheLlmTools(
        countTotalUsage(
            //        <- Note: for example here we don`t want the [🌯]
            $provideLlmToolsFromEnv(),
        ),
        {
            storage: new FileCacheStorage(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                { rootFolderPath: join(process.cwd(), EXECUTIONS_CACHE_DIRNAME) },
            ),
            isReloaded: isCacheReloaded,
        },
    );
}

/**
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: [🥃] Allow `ptbk make` without llm tools
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 * TODO: [®] DRY Register logic
 */
