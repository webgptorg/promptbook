import { join } from 'path';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { FilesStorage } from '../../storage/files-storage/FilesStorage';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { createLlmToolsFromEnv } from './createLlmToolsFromEnv';
import { cacheLlmTools } from './utils/cache/cacheLlmTools';

/**
 * Returns LLM tools for CLI
 *
 * @private within the package - for CLI utils
 */
export function getLlmToolsForCli(): LlmExecutionTools {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    return cacheLlmTools(createLlmToolsFromEnv(), {
        storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), '/.promptbook/executions-cache') }),
    });
}

/**
 * Note: [🟡] This code should never be published outside of `@promptbook/cli`
 */
