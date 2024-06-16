// @promptbook/mock

import { MockedEchoLlmExecutionTools } from '../execution/plugins/llm-execution-tools/mocked/MockedEchoLlmExecutionTools';
import { MockedFackedLlmExecutionTools } from '../execution/plugins/llm-execution-tools/mocked/MockedFackedLlmExecutionTools';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };
export { MockedEchoLlmExecutionTools, MockedFackedLlmExecutionTools };

/**
 * TODO: [🚏] FakeLLM
 */
