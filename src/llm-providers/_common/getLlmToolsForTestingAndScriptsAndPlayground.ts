import { join } from 'path';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { FilesStorage } from '../../storage/files-storage/FilesStorage';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { keepImported } from '../../utils/organization/keepImported';
import { MockedFackedLlmExecutionTools } from '../mocked/MockedFackedLlmExecutionTools';
import { createLlmToolsFromEnv } from './createLlmToolsFromEnv';
import { cacheLlmTools } from './utils/cache/cacheLlmTools';

/**
 * Returns LLM tools for testing purposes
 *
 * @private within the repository - JUST FOR TESTS, SCRIPTS AND PLAYGROUND
 */
export function getLlmToolsForTestingAndScriptsAndPlayground(): LlmExecutionTools {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `getLlmToolsForTestingAndScriptsAndPlayground` works only in Node.js environment',
        );
    }

    keepImported(createLlmToolsFromEnv);
    keepImported(MockedFackedLlmExecutionTools);

    return cacheLlmTools(
        // Note: In normal situations, we "turn off" ability to use real API keys in tests:

        // When working on preparations, you can use:
        createLlmToolsFromEnv(),

        // BUT otherwise keep this by default:
        //new MockedFackedLlmExecutionTools(), // <- TODO: !!!!! Make this work
        {
            storage: new FilesStorage({ cacheFolderPath: join(process.cwd(), '/executions-cache') }),
        },
    );
}

/**
 * Note: [⚪] This should never be in any released package
 */
