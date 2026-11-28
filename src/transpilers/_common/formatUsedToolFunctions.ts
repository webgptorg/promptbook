import type { string_javascript_name } from '../../types/string_person_fullname';

/**
 * Formats used tool functions into object-literal method syntax for generated SDK harnesses.
 *
 * Tool implementations are authored in several shapes across the repository:
 * - object-literal methods
 * - function declarations
 * - arrow functions
 *
 * This helper normalizes all supported shapes into valid object members so the
 * transpiled `tools` block stays syntactically correct.
 *
 * @param usedToolFunctions - Tool function sources indexed by tool name.
 * @returns Object-member definitions ready to embed inside a transpiled `const tools = { ... }` block.
 *
 * @private shared between SDK transpilers
 */
export function formatUsedToolFunctions(usedToolFunctions: Record<string_javascript_name, string>): string {
    return Object.entries(usedToolFunctions)
        .map(([toolName, toolFunctionSource]) => `${formatToolFunctionSource(toolName, toolFunctionSource)},`)
        .join('\n');
}

/**
 * Matches callable sources written as object-literal methods or function declarations.
 *
 * @private shared between SDK transpilers
 */
const CALLABLE_SOURCE_PATTERN =
    /^(?<asyncPrefix>async\s+)?(?:(?:function\s*(?:[A-Za-z_$][\w$]*)?)|(?:\[[^\]]+\])|(?:[A-Za-z_$][\w$]*))\s*\((?<parameters>[\s\S]*?)\)\s*(?<body>\{[\s\S]*\})$/;

/**
 * Matches callable sources written as arrow functions.
 *
 * @private shared between SDK transpilers
 */
const ARROW_SOURCE_PATTERN =
    /^(?<asyncPrefix>async\s+)?(?:(?<parenthesizedParameters>\([\s\S]*?\))|(?<singleParameter>[A-Za-z_$][\w$]*))\s*=>\s*(?<body>[\s\S]+)$/;

/**
 * Formats one tool function source so it can be embedded as an object member.
 *
 * @param toolName - Tool name used as the object-literal member name.
 * @param toolFunctionSource - Source returned by `Function.prototype.toString()`.
 * @returns Valid object-literal member source.
 *
 * @private shared between SDK transpilers
 */
function formatToolFunctionSource(toolName: string_javascript_name, toolFunctionSource: string): string {
    const normalizedSource = toolFunctionSource.trim();

    const callableMatch = normalizedSource.match(CALLABLE_SOURCE_PATTERN);
    if (callableMatch?.groups) {
        const { asyncPrefix, parameters, body } = callableMatch.groups as {
            asyncPrefix?: string;
            body?: string;
            parameters?: string;
        };
        const resolvedAsyncPrefix = asyncPrefix || '';
        const resolvedParameters = (parameters || '').trim();
        const resolvedBody = (body || '').trimStart();

        return `${resolvedAsyncPrefix}${toolName}(${resolvedParameters}) ${resolvedBody}`;
    }

    const arrowMatch = normalizedSource.match(ARROW_SOURCE_PATTERN);
    if (arrowMatch?.groups) {
        const { asyncPrefix, body, parenthesizedParameters, singleParameter } = arrowMatch.groups as {
            asyncPrefix?: string;
            body?: string;
            parenthesizedParameters?: string;
            singleParameter?: string;
        };
        const resolvedAsyncPrefix = asyncPrefix || '';
        const rawParameters = parenthesizedParameters || singleParameter || '';
        const parameters = normalizeArrowParameters(rawParameters);
        const resolvedBody = (body || '').trimStart();

        if (resolvedBody.startsWith('{')) {
            return `${resolvedAsyncPrefix}${toolName}(${parameters}) ${resolvedBody}`;
        }

        return `${resolvedAsyncPrefix}${toolName}(${parameters}) { return ${resolvedBody.replace(/;$/, '').trim()}; }`;
    }

    return normalizedSource;
}

/**
 * Removes wrapping parentheses from arrow-function parameters when needed.
 *
 * @param parameters - Raw arrow-function parameter source.
 * @returns Parameter list ready to be used in a method definition.
 *
 * @private shared between SDK transpilers
 */
function normalizeArrowParameters(parameters: string): string {
    const trimmedParameters = parameters.trim();

    if (trimmedParameters.startsWith('(') && trimmedParameters.endsWith(')')) {
        return trimmedParameters.slice(1, -1).trim();
    }

    return trimmedParameters;
}
