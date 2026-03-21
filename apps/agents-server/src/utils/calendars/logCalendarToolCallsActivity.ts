import type { Json, ToolCall } from '@promptbook-local/types';
import { createCalendarActivity, listCalendarConnections } from './calendarConnections';

/**
 * Supported calendar tool names emitted by USE CALENDAR commitment.
 */
const CALENDAR_TOOL_NAME_TO_OPERATION: Record<string, string> = {
    calendar_list_events: 'list_events',
    calendar_get_event: 'get_event',
    calendar_create_event: 'create_event',
    calendar_update_event: 'update_event',
    calendar_delete_event: 'delete_event',
    calendar_invite_guests: 'invite_guests',
};

/**
 * Input payload for logging calendar tool-call activity.
 */
export type LogCalendarToolCallsActivityOptions = {
    userId?: number | null;
    agentPermanentId: string;
    toolCalls?: ReadonlyArray<ToolCall>;
};

/**
 * Persists one audit-like calendar activity row for each completed calendar tool call.
 */
export async function logCalendarToolCallsActivity(options: LogCalendarToolCallsActivityOptions): Promise<void> {
    if (!options.toolCalls || options.toolCalls.length === 0) {
        return;
    }

    const userId = options.userId ?? null;
    const connections = userId
        ? await listCalendarConnections({
              userId,
              agentPermanentId: options.agentPermanentId,
              provider: 'google',
              includeDisconnected: true,
          })
        : [];
    const connectionByCalendarUrl = new Map(connections.map((connection) => [connection.calendarUrl, connection]));

    for (const toolCall of options.toolCalls) {
        const operation = CALENDAR_TOOL_NAME_TO_OPERATION[toolCall.name];
        if (!operation) {
            continue;
        }

        const parsedArguments = normalizeObjectPayload(toolCall.arguments);
        const parsedResult = normalizeObjectPayload(toolCall.result);
        const parsedResultEvent = normalizeObjectPayload(parsedResult?.event);
        const calendarUrl =
            normalizeOptionalText(parsedArguments?.calendarUrl) || normalizeOptionalText(parsedResult?.calendarUrl);
        const eventId =
            normalizeOptionalText(parsedArguments?.eventId) ||
            normalizeOptionalText(parsedResult?.eventId) ||
            normalizeOptionalText(parsedResultEvent?.id);
        const status = resolveCalendarToolCallStatus(toolCall, parsedResult);
        const connection = calendarUrl ? connectionByCalendarUrl.get(calendarUrl) : undefined;
        const details: { [key: string]: Json | undefined } = {
            toolName: normalizeJsonValue(toolCall.name),
            state: normalizeJsonValue(toolCall.state || null),
            arguments: normalizeJsonValue(parsedArguments),
            result: normalizeJsonValue(parsedResult),
            errors: normalizeJsonValue(toolCall.errors || []),
        };

        await createCalendarActivity({
            userId,
            agentPermanentId: options.agentPermanentId,
            connectionId: connection?.id ?? null,
            provider: 'google',
            operation,
            calendarUrl: calendarUrl ?? connection?.calendarUrl ?? null,
            eventId: eventId ?? null,
            status,
            details,
        });
    }
}

/**
 * Normalizes unknown payload into plain object when possible.
 */
function normalizeObjectPayload(value: unknown): Record<string, unknown> | null {
    if (!value) {
        return null;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : null;
        } catch {
            return null;
        }
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }

    return null;
}

/**
 * Resolves normalized status value for one calendar tool call.
 */
function resolveCalendarToolCallStatus(
    toolCall: ToolCall,
    parsedResult: Record<string, unknown> | null,
): 'success' | 'error' | 'wallet-required' {
    if (toolCall.state === 'ERROR' || (toolCall.errors && toolCall.errors.length > 0)) {
        return 'error';
    }

    if (normalizeOptionalText(parsedResult?.status) === 'wallet-credential-required') {
        return 'wallet-required';
    }

    return 'success';
}

/**
 * Converts unknown runtime payload into JSON-safe value for persistence.
 */
function normalizeJsonValue(value: unknown): Json {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeJsonValue(item));
    }

    if (typeof value === 'object') {
        const normalizedRecord: { [key: string]: Json | undefined } = {};
        for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
            normalizedRecord[key] = normalizeJsonValue(nestedValue);
        }

        return normalizedRecord;
    }

    return String(value);
}

/**
 * Normalizes one optional textual value.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}
