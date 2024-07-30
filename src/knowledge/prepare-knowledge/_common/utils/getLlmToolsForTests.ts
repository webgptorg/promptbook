import { join } from 'path';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import { cacheLlmTools } from '../../../../llm-providers/utils/cache/cacheLlmTools';
import { createLlmToolsFromEnv } from '../../../../llm-providers/utils/createLlmToolsFromEnv';
import { FilesStorage } from '../../../../storage/files-storage/FilesStorage';

/**
 * Returns LLM tools for testing purposes
 *
 * @private within the package - JUST FOR TESTS
 */
export function getLlmToolsForTests(): LlmExecutionTools {
    return cacheLlmTools(createLlmToolsFromEnv(), {
        storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), '/executions-cache') }),
    });
}
