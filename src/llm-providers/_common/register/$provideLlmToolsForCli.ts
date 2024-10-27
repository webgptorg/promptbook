import { join } from 'path';
import { DEFAULT_EXECUTIONS_CACHE_DIRNAME } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { cacheLlmTools } from '../utils/cache/cacheLlmTools';
import { CacheLlmToolsOptions } from '../utils/cache/CacheLlmToolsOptions';
import { countTotalUsage } from '../utils/count-total-usage/countTotalUsage';
import type { LlmExecutionToolsWithTotalUsage } from '../utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
import { $provideLlmToolsFromEnv } from './$provideLlmToolsFromEnv';

/**
 * Returns LLM tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export function $provideLlmToolsForCli(
    options?: Pick<CacheLlmToolsOptions, 'isCacheReloaded'>,
): LlmExecutionToolsWithTotalUsage {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `$provideLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const { isCacheReloaded } = options ?? {};

    return cacheLlmTools(
        countTotalUsage(
            //        <- Note: for example here we don`t want the [🌯]
            $provideLlmToolsFromEnv(),
        ),
        {
            storage: new FileCacheStorage(
                { fs: $provideFilesystemForNode() },
                { rootFolderPath: join(process.cwd(), DEFAULT_EXECUTIONS_CACHE_DIRNAME // <- TODO: [🦒] Allow to override (pass different value into the function)

                ) },
            ),
            isCacheReloaded,
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
