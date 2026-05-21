import {
    TOOL_PROGRESS_TOKEN_ARGUMENT,
    TOOL_PROGRESS_TOKEN_PARAMETER,
    TOOL_RUNTIME_CONTEXT_ARGUMENT,
    TOOL_RUNTIME_CONTEXT_PARAMETER,
} from '../../../commitments/_common/toolRuntimeContext';

/**
 * Builds a tool invocation script that injects hidden runtime context into tool args.
 *
 * @private utility of OpenAI tool execution wrappers
 */
export function buildToolInvocationScript(options: {
    readonly functionName: string;
    readonly functionArgsExpression: string;
}): string {
    const { functionName, functionArgsExpression } = options;

    return `
        const args = ${functionArgsExpression};
        const runtimeContextRaw =
            typeof ${TOOL_RUNTIME_CONTEXT_PARAMETER} === 'undefined'
                ? undefined
                : ${TOOL_RUNTIME_CONTEXT_PARAMETER};

        if (runtimeContextRaw !== undefined && args && typeof args === 'object' && !Array.isArray(args)) {
            args.${TOOL_RUNTIME_CONTEXT_ARGUMENT} = runtimeContextRaw;
        }

        const toolProgressTokenRaw =
            typeof ${TOOL_PROGRESS_TOKEN_PARAMETER} === 'undefined'
                ? undefined
                : ${TOOL_PROGRESS_TOKEN_PARAMETER};

        if (toolProgressTokenRaw !== undefined && args && typeof args === 'object' && !Array.isArray(args)) {
            args.${TOOL_PROGRESS_TOKEN_ARGUMENT} = toolProgressTokenRaw;
        }

        return await ${functionName}(args);
    `;
}
