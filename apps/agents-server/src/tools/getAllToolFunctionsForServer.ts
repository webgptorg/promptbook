import type { string_javascript_name } from '../../../../src/_packages/types.index';
import {
    createToolFunctionsProxy,
    type CommitmentToolFunctions,
} from '../../../../src/commitments/_common/commitmentToolFunctions';
import type { ToolFunction } from '../../../../src/scripting/javascript/JavascriptExecutionToolsOptions';
import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { agent_progress } from './agent_progress';
import { createChatAttachmentToolFunctions } from './createChatAttachmentToolFunctions';

/**
 * Static tool functions added by the Agents Server on top of commitment-provided tools.
 */
const SERVER_TOOL_FUNCTIONS: CommitmentToolFunctions = {
    ...createChatAttachmentToolFunctions(),
    agent_progress,
};

/**
 * Dynamic proxy that keeps commitment tool registration live even after the server runtime
 * has already been constructed.
 */
const serverToolFunctionsProxy = createToolFunctionsProxy(() => ({
    ...getAllCommitmentsToolFunctionsForNode(),
    ...SERVER_TOOL_FUNCTIONS,
}));

/**
 * Returns all script-callable tool implementations used by Agents Server runtimes.
 */
export function getAllToolFunctionsForServer(): Record<string_javascript_name, ToolFunction> {
    return serverToolFunctionsProxy;
}
