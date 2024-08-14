import { join } from 'path';
import { EXECUTIONS_CACHE_DIRNAME } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { FilesStorage } from '../../storage/files-storage/FilesStorage';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { createLlmToolsFromEnv } from './createLlmToolsFromEnv';
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
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    const { isCacheReloaded = false } = options ?? {};

    return cacheLlmTools(
        countTotalUsage(
            //        <- Note: for example here we don`t want the [🌯]
            createLlmToolsFromEnv(),
        ),
        {
            storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), EXECUTIONS_CACHE_DIRNAME) }),
            isReloaded: isCacheReloaded,
        },
    );
}

/**
 * Note: [🟡] This code should never be published outside of `@promptbook/cli`
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: [🥃] Allow `ptbk make` without llm tools
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 */
