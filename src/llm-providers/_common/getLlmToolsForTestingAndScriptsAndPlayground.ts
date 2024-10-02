import { join } from 'path';
import '../../_packages/cli.index'; // <- Note: Really importing core index to register all the LLM providers
import { EXECUTIONS_CACHE_DIRNAME, IS_COST_PREVENTED } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { FileCacheStorage } from '../../storage/file-cache-storage/FileCacheStorage';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import type { CreateLlmToolsFromConfigurationOptions } from './createLlmToolsFromConfiguration';
import { createLlmToolsFromEnv } from './createLlmToolsFromEnv';
import { cacheLlmTools } from './utils/cache/cacheLlmTools';
import { countTotalUsage } from './utils/count-total-usage/countTotalUsage';
import { limitTotalUsage } from './utils/count-total-usage/limitTotalUsage';
import type { LlmExecutionToolsWithTotalUsage } from './utils/count-total-usage/LlmExecutionToolsWithTotalUsage';

type GetLlmToolsForTestingAndScriptsAndPlaygroundOptions = CreateLlmToolsFromConfigurationOptions & {
    /**
     * @@@
     *
     * @default false
     */
    isCacheReloaded?: boolean;
};

/**
 * Returns LLM tools for testing purposes
 *
 * @private within the repository - JUST FOR TESTS, SCRIPTS AND PLAYGROUND
 */
export function getLlmToolsForTestingAndScriptsAndPlayground(
    options?: GetLlmToolsForTestingAndScriptsAndPlaygroundOptions,
): LlmExecutionToolsWithTotalUsage {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const { isCacheReloaded = false, ...restOptions } = options ?? {};

    const llmTools: LlmExecutionTools = createLlmToolsFromEnv(restOptions);
    const llmToolsWithUsage = !IS_COST_PREVENTED
        ? countTotalUsage(llmTools)
        : //    <- Note: for example here we don`t want the [🌯]
          limitTotalUsage(llmTools);
    //          <- Note: `limitTotalUsage` will do everything as `countTotalUsage` and adds usage limit
    //          <- Note: for example here we don`t want the [🌯]

    return cacheLlmTools(llmToolsWithUsage, {
        storage: new FileCacheStorage(
            //            <- TODO: [🧱] Implement in a functional (not new Class) way
            { rootFolderPath: join(process.cwd(), EXECUTIONS_CACHE_DIRNAME) },
        ),
        isReloaded: isCacheReloaded,
    });
}

/**
 * Note: [⚪] This should never be in any released package
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 */
