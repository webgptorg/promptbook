import { join } from 'path';
import { DEFAULT_EXECUTION_CACHE_DIRNAME } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { cacheLlmTools } from '../utils/cache/cacheLlmTools';
import type { CacheLlmToolsOptions } from '../utils/cache/CacheLlmToolsOptions';
import { countUsage } from '../utils/count-total-usage/countTotalUsage';
import type { LlmExecutionToolsWithTotalUsage } from '../utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
import { $provideLlmToolsFromEnv } from './$provideLlmToolsFromEnv';

/**
 * Returns LLM tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export async function $provideLlmToolsForWizzardOrCli(
    options?: Pick<CacheLlmToolsOptions, 'isCacheReloaded'>,
): Promise<LlmExecutionToolsWithTotalUsage> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `$provideLlmToolsForWizzardOrCli` works only in Node.js environment',
        );
    }

    const { isCacheReloaded } = options ?? {};

    return cacheLlmTools(
        countUsage(
            //        <- Note: for example here we don`t want the [🌯]
            await $provideLlmToolsFromEnv(),
        ),
        {
            storage: new FileCacheStorage(
                { fs: $provideFilesystemForNode() },
                {
                    rootFolderPath: join(
                        process.cwd(),
                        DEFAULT_EXECUTION_CACHE_DIRNAME, // <- TODO: [🦒] Allow to override (pass different value into the function)
                    ),
                },
            ),
            isCacheReloaded,
        },
    );
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: [🥃] Allow `ptbk make` without llm tools
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 * TODO: [®] DRY Register logic
 */
