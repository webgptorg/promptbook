import { isAssistantPreparationToolCall, type ToolCall, type ToolCallState } from '../../types/ToolCall';
import { getToolCallIdentity } from './getToolCallIdentity';

/**
 * Merges streamed tool-call snapshots by stable identity while preserving incremental logs,
 * warnings, and partial results.
 *
 * @param existingToolCalls - Previously known tool-call snapshots.
 * @param incomingToolCalls - Newly observed tool-call snapshots.
 * @returns Aggregated tool-call list with newer snapshots merged in place.
 *
 * @private shared helper for streaming chat surfaces
 */
export function mergeToolCalls(
    existingToolCalls: ReadonlyArray<ToolCall> | undefined,
    incomingToolCalls: ReadonlyArray<ToolCall> | undefined,
): Array<ToolCall> {
    if (!existingToolCalls || existingToolCalls.length === 0) {
        return incomingToolCalls ? deduplicatePreparationToolCalls([...incomingToolCalls]) : [];
    }

    if (!incomingToolCalls || incomingToolCalls.length === 0) {
        return [...existingToolCalls];
    }

    const mergedToolCalls = [...existingToolCalls];

    for (const incomingToolCall of incomingToolCalls) {
        if (isAssistantPreparationToolCall(incomingToolCall)) {
            // A new preparation phase always replaces any previous assistant_preparation tool
            // call, regardless of phase argument, so only one chip is ever shown at a time.
            const existingPreparationIndex = mergedToolCalls.findIndex(isAssistantPreparationToolCall);
            if (existingPreparationIndex !== -1) {
                mergedToolCalls.splice(existingPreparationIndex, 1);
            }
            mergedToolCalls.push(incomingToolCall);
            continue;
        }

        const incomingIdentity = getToolCallIdentity(incomingToolCall);
        const existingIndex = mergedToolCalls.findIndex(
            (existingToolCall) => getToolCallIdentity(existingToolCall) === incomingIdentity,
        );

        if (existingIndex === -1) {
            mergedToolCalls.push(incomingToolCall);
            continue;
        }

        mergedToolCalls[existingIndex] = mergeToolCallSnapshot(mergedToolCalls[existingIndex]!, incomingToolCall);
    }

    return mergedToolCalls;
}

/**
 * Merges two snapshots of the same tool call.
 *
 * @param existingToolCall - Previous snapshot.
 * @param incomingToolCall - New snapshot.
 * @returns One merged snapshot.
 *
 * @private helper of `mergeToolCalls`
 */
function mergeToolCallSnapshot(existingToolCall: ToolCall, incomingToolCall: ToolCall): ToolCall {
    const incomingResult = incomingToolCall.result;
    const shouldKeepExistingResult =
        incomingResult === '' && existingToolCall.result !== undefined && existingToolCall.result !== '';

    return {
        ...existingToolCall,
        ...incomingToolCall,
        result: shouldKeepExistingResult ? existingToolCall.result : incomingResult ?? existingToolCall.result,
        createdAt: existingToolCall.createdAt || incomingToolCall.createdAt,
        state: resolveMergedToolCallState(existingToolCall, incomingToolCall),
        errors: mergeUnknownLists(existingToolCall.errors, incomingToolCall.errors),
        warnings: mergeUnknownLists(existingToolCall.warnings, incomingToolCall.warnings),
        logs: mergeUnknownLists(existingToolCall.logs, incomingToolCall.logs),
    };
}

/**
 * Resolves the most recent lifecycle state from two snapshots of the same tool call.
 *
 * @param existingToolCall - Previous snapshot.
 * @param incomingToolCall - New snapshot.
 * @returns Resolved lifecycle state or `undefined` when neither snapshot provides enough data.
 *
 * @private helper of `mergeToolCalls`
 */
function resolveMergedToolCallState(existingToolCall: ToolCall, incomingToolCall: ToolCall): ToolCallState | undefined {
    return (
        incomingToolCall.state ||
        inferToolCallState(incomingToolCall) ||
        existingToolCall.state ||
        inferToolCallState(existingToolCall)
    );
}

/**
 * Infers lifecycle state from result, logs, and errors when explicit state is missing.
 *
 * @param toolCall - Tool call snapshot to inspect.
 * @returns Inferred lifecycle state or `undefined`.
 *
 * @private helper of `mergeToolCalls`
 */
function inferToolCallState(toolCall: ToolCall): ToolCallState | undefined {
    if (Array.isArray(toolCall.errors) && toolCall.errors.length > 0) {
        return 'ERROR';
    }

    if (toolCall.result !== undefined && toolCall.result !== '') {
        return 'COMPLETE';
    }

    if (Array.isArray(toolCall.logs) && toolCall.logs.length > 0) {
        return 'PARTIAL';
    }

    if (toolCall.arguments !== undefined || toolCall.rawToolCall !== undefined) {
        return 'PENDING';
    }

    return undefined;
}

/**
 * Merges two readonly lists while dropping duplicate entries by serialized value.
 *
 * @param existingValues - Previous list.
 * @param incomingValues - Incoming list.
 * @returns Deduplicated merged list or `undefined`.
 *
 * @private helper of `mergeToolCalls`
 */
function mergeUnknownLists<T>(
    existingValues: ReadonlyArray<T> | undefined,
    incomingValues: ReadonlyArray<T> | undefined,
): Array<T> | undefined {
    if (!existingValues || existingValues.length === 0) {
        return incomingValues ? [...incomingValues] : undefined;
    }

    if (!incomingValues || incomingValues.length === 0) {
        return [...existingValues];
    }

    const mergedValues: Array<T> = [];
    const seenValueKeys = new Set<string>();

    for (const value of [...existingValues, ...incomingValues]) {
        const valueKey = serializeValueForMerge(value);
        if (seenValueKeys.has(valueKey)) {
            continue;
        }

        seenValueKeys.add(valueKey);
        mergedValues.push(value);
    }

    return mergedValues;
}

/**
 * Builds a stable deduplication signature for arbitrary JSON-like values.
 *
 * @param value - Value to serialize.
 * @returns String signature.
 *
 * @private helper of `mergeToolCalls`
 */
function serializeValueForMerge(value: unknown): string {
    try {
        return JSON.stringify(value) ?? String(value);
    } catch {
        return String(value);
    }
}

/**
 * Ensures at most one `assistant_preparation` tool call survives in the list,
 * keeping the last occurrence so the most recent preparation phase is shown.
 *
 * @param toolCalls - Mutable list to deduplicate in-place.
 * @returns The same array after removing redundant preparation entries.
 *
 * @private helper of `mergeToolCalls`
 */
function deduplicatePreparationToolCalls(toolCalls: Array<ToolCall>): Array<ToolCall> {
    let lastPreparationIndex = -1;

    for (let index = toolCalls.length - 1; index >= 0; index--) {
        if (!isAssistantPreparationToolCall(toolCalls[index]!)) {
            continue;
        }

        if (lastPreparationIndex === -1) {
            lastPreparationIndex = index;
        } else {
            // Remove earlier duplicate — keep only the last (most recent) one.
            toolCalls.splice(index, 1);
        }
    }

    return toolCalls;
}
