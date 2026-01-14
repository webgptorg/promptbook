import type { ToolCall } from '../../../types/ToolCall';
import type { TODO_any } from '../../../utils/organization/TODO_any';

export function parseToolCallArguments(toolCall: Pick<ToolCall, 'arguments'>): Record<string, TODO_any> {
    if (!toolCall.arguments) {
        return {};
    }

    if (typeof toolCall.arguments === 'string') {
        try {
            const parsed = JSON.parse(toolCall.arguments);
            return typeof parsed === 'object' && parsed ? parsed : {};
        } catch {
            return {};
        }
    }

    return toolCall.arguments;
}

export function parseToolCallResult(result: ToolCall['result']): TODO_any {
    if (typeof result !== 'string') {
        return result;
    }

    try {
        return JSON.parse(result);
    } catch {
        return result;
    }
}

export function getToolCallTimestamp(toolCall: Pick<ToolCall, 'createdAt'>): Date | null {
    if (!toolCall.createdAt) {
        return null;
    }

    const date = new Date(toolCall.createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function getToolCallResultDate(result: ToolCall['result']): Date | null {
    if (result === null || result === undefined) {
        return null;
    }

    if (typeof result === 'string' || typeof result === 'number') {
        const date = new Date(result);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof result === 'object') {
        const candidate =
            (result as Record<string, TODO_any>).time ??
            (result as Record<string, TODO_any>).timestamp ??
            (result as Record<string, TODO_any>).now;
        if (candidate) {
            return getToolCallResultDate(candidate);
        }
    }

    return null;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 *         <- TODO: But maybe split into multiple files later?
 */
