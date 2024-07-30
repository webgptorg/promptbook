import { join } from 'path';
import { EnvironmentMismatchError } from '../../../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import { cacheLlmTools } from '../../../../llm-providers/utils/cache/cacheLlmTools';
import { createLlmToolsFromEnv } from '../../../../llm-providers/utils/createLlmToolsFromEnv';
import { FilesStorage } from '../../../../storage/files-storage/FilesStorage';
import { isRunningInNode } from '../../../../utils/isRunningInWhatever';

/**
 * Returns LLM tools for testing purposes
 *
 * @private within the package - JUST FOR TESTS, SCRIPTS AND PLAYGROUND
 */
export function getLlmToolsForTestingAndScriptsAndPlayground(): LlmExecutionTools {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    return cacheLlmTools(createLlmToolsFromEnv(), {
        storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), '/executions-cache') }),
    });
}


/**
 * Note: [⚪]
 */