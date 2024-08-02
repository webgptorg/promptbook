import { join } from 'path';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { FilesStorage } from '../../storage/files-storage/FilesStorage';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { just } from '../../utils/organization/just';
import { keepUnused } from '../../utils/organization/keepUnused';
import { MockedFackedLlmExecutionTools } from '../mocked/MockedFackedLlmExecutionTools';
import { createLlmToolsFromEnv, CreateLlmToolsFromEnvOptions } from './createLlmToolsFromEnv';
import { cacheLlmTools } from './utils/cache/cacheLlmTools';
import { limitTotalCost } from './utils/count-total-cost/limitTotalCost';

/**
 * Returns LLM tools for testing purposes
 *
 * @private within the repository - JUST FOR TESTS, SCRIPTS AND PLAYGROUND
 */
export function getLlmToolsForTestingAndScriptsAndPlayground(options: CreateLlmToolsFromEnvOptions): LlmExecutionTools {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    keepUnused(createLlmToolsFromEnv);
    keepUnused(MockedFackedLlmExecutionTools);

    let llmTools: LlmExecutionTools = createLlmToolsFromEnv(options);

    if (
        /**/
        // Note: In normal situations, we "turn off" ability to use real API keys in tests:
        just(true)
        /**/

        /*/
        // When working on preparations, you can use:
        just(false)
        /**/
    ) {
        llmTools = limitTotalCost(llmTools);
    }

    return cacheLlmTools(llmTools, {
        storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), '/executions-cache') }),
    });
}

/**
 * Note: [⚪] This should never be in any released package
 */
