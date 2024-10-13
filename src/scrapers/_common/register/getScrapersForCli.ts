import { join } from 'path';
import { EXECUTIONS_CACHE_DIRNAME } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { createScrapersFromEnv } from './createScrapersFromEnv';
import { cacheScrapers } from './utils/cache/cacheScrapers';
import { countTotalUsage } from './utils/count-total-usage/countTotalUsage';
import type { LlmExecutionToolsWithTotalUsage } from './utils/count-total-usage/LlmExecutionToolsWithTotalUsage';

type GetScrapersForCliOptions = {
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
export function getScrapersForCli(options?: GetScrapersForCliOptions): LlmExecutionToolsWithTotalUsage {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getScrapersForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const { isCacheReloaded = false } = options ?? {};

    return cacheScrapers(
        countTotalUsage(
            //        <- Note: for example here we don`t want the [🌯]
            createScrapersFromEnv(),
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
 * TODO: [👷‍♂️] @@@ Manual about construction of scrapers
 * TODO: [🥃] Allow `ptbk make` without scrapers
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 * TODO: [®] DRY Register logic
 */
