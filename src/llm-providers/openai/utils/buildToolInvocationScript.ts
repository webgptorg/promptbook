import {
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

        return await ${functionName}(args);
    `;
}
