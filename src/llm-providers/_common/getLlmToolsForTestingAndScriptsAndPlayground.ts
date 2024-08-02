import { join } from 'path';
import { DEBUG_ALLOW_PAYED_TESTING } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { FilesStorage } from '../../storage/files-storage/FilesStorage';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { keepUnused } from '../../utils/organization/keepUnused';
import { MockedFackedLlmExecutionTools } from '../mocked/MockedFackedLlmExecutionTools';
import type { CreateLlmToolsFromEnvOptions } from './createLlmToolsFromEnv';
import { createLlmToolsFromEnv } from './createLlmToolsFromEnv';
import { cacheLlmTools } from './utils/cache/cacheLlmTools';
import { limitTotalCost } from './utils/count-total-cost/limitTotalCost';

/**
 * Returns LLM tools for testing purposes
 *
 * @private within the repository - JUST FOR TESTS, SCRIPTS AND PLAYGROUND
 */
export function getLlmToolsForTestingAndScriptsAndPlayground(
    options?: CreateLlmToolsFromEnvOptions,
): LlmExecutionTools {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    keepUnused(createLlmToolsFromEnv);
    keepUnused(MockedFackedLlmExecutionTools);

    let llmTools: LlmExecutionTools = createLlmToolsFromEnv(options);

    if (!DEBUG_ALLOW_PAYED_TESTING) {
        llmTools = limitTotalCost(llmTools);
    }

    return cacheLlmTools(llmTools, {
        storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), '/executions-cache') }),
    });
}

/**
 * Note: [⚪] This should never be in any released package
 */
