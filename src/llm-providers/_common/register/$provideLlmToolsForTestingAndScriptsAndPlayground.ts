import { join } from 'path';
import { DEFAULT_EXECUTION_CACHE_DIRNAME, IS_COST_PREVENTED } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import '../../../_packages/cli.index'; // <- Note: Really importing core index to register all the LLM providers
import { cacheLlmTools } from '../utils/cache/cacheLlmTools';
import { countUsage } from '../utils/count-total-usage/countUsage';
import { limitTotalUsage } from '../utils/count-total-usage/limitTotalUsage';
import type { LlmExecutionToolsWithTotalUsage } from '../utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
import { $provideLlmToolsFromEnv } from './$provideLlmToolsFromEnv';
import type { CreateLlmToolsFromConfigurationOptions } from './createLlmToolsFromConfiguration';

type GetLlmToolsForTestingAndScriptsAndPlaygroundOptions = CreateLlmToolsFromConfigurationOptions & {
    /**
     * Flag indicating whether the cache should be reloaded or reused
     * When set to true, the existing cache will not be used but thinks will be still saved to the cache
     *
     * @default false
     */
    isCacheReloaded?: boolean;
};

/**
 * Returns LLM tools for testing purposes
 *
 * Note: `$` is used to indicate that this function is not a pure function - it uses filesystem to access `.env` file
 *
 * @private within the repository - JUST FOR TESTS, SCRIPTS AND PLAYGROUND
 */
export async function $provideLlmToolsForTestingAndScriptsAndPlayground(
    options?: GetLlmToolsForTestingAndScriptsAndPlaygroundOptions,
): Promise<LlmExecutionToolsWithTotalUsage> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `$provideLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const { isCacheReloaded = false, ...restOptions } = options ?? {};

    const llmTools: LlmExecutionTools = await $provideLlmToolsFromEnv({
        title: 'LLM Tools for testing, scripts and playground',
        ...restOptions,
    });
    const llmToolsWithUsage = !IS_COST_PREVENTED
        ? countUsage(llmTools)
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
                    DEFAULT_EXECUTION_CACHE_DIRNAME,
                    // <- TODO: [🦒] Allow to override (pass different value into the function)
                ),
            },
        ),
        isCacheReloaded: isCacheReloaded,
    });
}

/**
 * Note: [⚪] This should never be in any released package
 * TODO: [👷‍♂️] Write a comprehensive manual about the construction of LLM tools
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 * TODO: [®] DRY Register logi
 */
