import type { string_javascript_name } from '../../../../src/_packages/types.index';
import type { ToolFunction } from '../../../../src/scripting/javascript/JavascriptExecutionToolsOptions';
import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { createChatAttachmentToolFunctions } from './createChatAttachmentToolFunctions';

/**
 * Returns all script-callable tool implementations used by Agents Server runtimes.
 */
export function getAllToolFunctionsForServer(): Record<string_javascript_name, ToolFunction> {
    return {
        ...getAllCommitmentsToolFunctionsForNode(),
        ...createChatAttachmentToolFunctions(),
    };
}
