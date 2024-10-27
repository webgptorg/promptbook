import { join } from 'path';
import '../../../_packages/cli.index'; // <- Note: Really importing core index to register all the LLM providers
import { DEFAULT_EXECUTIONS_CACHE_DIRNAME } from '../../../config';
import { IS_COST_PREVENTED } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { cacheLlmTools } from '../utils/cache/cacheLlmTools';
import { countTotalUsage } from '../utils/count-total-usage/countTotalUsage';
import { limitTotalUsage } from '../utils/count-total-usage/limitTotalUsage';
import type { LlmExecutionToolsWithTotalUsage } from '../utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
import { $provideLlmToolsFromEnv } from './$provideLlmToolsFromEnv';
import type { CreateLlmToolsFromConfigurationOptions } from './createLlmToolsFromConfiguration';

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
export function $provideLlmToolsForTestingAndScriptsAndPlayground(
    options?: GetLlmToolsForTestingAndScriptsAndPlaygroundOptions,
): LlmExecutionToolsWithTotalUsage {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `$provideLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const { isCacheReloaded = false, ...restOptions } = options ?? {};

    const llmTools: LlmExecutionTools = $provideLlmToolsFromEnv(restOptions);
    const llmToolsWithUsage = !IS_COST_PREVENTED
        ? countTotalUsage(llmTools)
        : //    <- Note: for example here we don`t want the [🌯]
          limitTotalUsage(llmTools);
    //          <- Note: `limitTotalUsage` will do everything as `countTotalUsage` and adds usage limit
    //          <- Note: for example here we don`t want the [🌯]

    return cacheLlmTools(llmToolsWithUsage, {
        storage: new FileCacheStorage(
            { fs: $provideFilesystemForNode() },
            {
                rootFolderPath: join(
                    process.cwd(),
                    DEFAULT_EXECUTIONS_CACHE_DIRNAME,
                    // <- TODO: [🦒] Allow to override (pass different value into the function)
                ),
            },
        ),
        isCacheReloaded: isCacheReloaded,
    });
}

/**
 * Note: [⚪] This should never be in any released package
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 * TODO: [®] DRY Register logic
 */
