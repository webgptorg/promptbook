import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import { MockedEchoLlmExecutionTools } from '../../../../llm-providers/mocked/MockedEchoLlmExecutionTools';

/**
 * Returns LLM tools for testing purposes
 *
 * @private within the package - JUST FOR TESTS
 */
export function getLlmToolsForTests(): LlmExecutionTools {
    // TODO: !!!!!! Use
    // cacheLlmTools(createLlmToolsFromEnv,{storage: new FilesStorage({cacheFolderPath: process.cwd() + '/executions-cache'})});

    // TODO: !!!!!! Remove
    return new MockedEchoLlmExecutionTools();
}
