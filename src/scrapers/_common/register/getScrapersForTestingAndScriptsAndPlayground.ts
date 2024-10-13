import { join } from 'path';
import { EXECUTIONS_CACHE_DIRNAME, IS_COST_PREVENTED } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import '../../_packages/cli.index'; // <- Note: Really importing core index to register all the LLM providers
import type { CreateScrapersFromConfigurationOptions } from './createScrapersFromConfiguration';
import { createScrapersFromEnv } from './createScrapersFromEnv';
import { cacheScrapers } from './utils/cache/cacheScrapers';
import { countTotalUsage } from './utils/count-total-usage/countTotalUsage';
import { limitTotalUsage } from './utils/count-total-usage/limitTotalUsage';
import type { LlmExecutionToolsWithTotalUsage } from './utils/count-total-usage/LlmExecutionToolsWithTotalUsage';

type GetScrapersForTestingAndScriptsAndPlaygroundOptions = CreateScrapersFromConfigurationOptions & {
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
export function getScrapersForTestingAndScriptsAndPlayground(
    options?: GetScrapersForTestingAndScriptsAndPlaygroundOptions,
): LlmExecutionToolsWithTotalUsage {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getScrapersForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const { isCacheReloaded = false, ...restOptions } = options ?? {};

    const scrapers: LlmExecutionTools = createScrapersFromEnv(restOptions);
    const scrapersWithUsage = !IS_COST_PREVENTED
        ? countTotalUsage(scrapers)
        : //    <- Note: for example here we don`t want the [🌯]
          limitTotalUsage(scrapers);
    //          <- Note: `limitTotalUsage` will do everything as `countTotalUsage` and adds usage limit
    //          <- Note: for example here we don`t want the [🌯]

    return cacheScrapers(scrapersWithUsage, {
        storage: new FileCacheStorage(
            //            <- TODO: [🧱] Implement in a functional (not new Class) way
            { rootFolderPath: join(process.cwd(), EXECUTIONS_CACHE_DIRNAME) },
        ),
        isReloaded: isCacheReloaded,
    });
}

/**
 * Note: [⚪] This should never be in any released package
 * TODO: [👷‍♂️] @@@ Manual about construction of scrapers
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 * TODO: [®] DRY Register logic
 */
