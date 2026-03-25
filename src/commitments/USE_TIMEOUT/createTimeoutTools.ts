import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { TimeoutToolNames } from './TimeoutToolNames';

/**
 * Adds `USE TIMEOUT` tool definitions while preserving already registered tools.
 *
 * @private internal utility of USE TIMEOUT
 */
export function createTimeoutTools(existingTools: ReadonlyArray<LlmToolDefinition> = []): Array<LlmToolDefinition> {
    const tools = [...existingTools];

    if (!tools.some((tool) => tool.name === TimeoutToolNames.set)) {
        tools.push({
            name: TimeoutToolNames.set,
            description:
                'Schedule one thread-scoped wake-up in the current chat. The timer returns immediately and wakes this same conversation later.',
            parameters: {
                type: 'object',
                properties: {
                    milliseconds: {
                        type: 'number',
                        description: 'Delay in milliseconds before the timeout wakes the same chat thread.',
                    },
                    message: {
                        type: 'string',
                        description: 'Optional note appended to the future timeout wake-up message.',
                    },
                },
                required: ['milliseconds'],
            },
        });
    }

    if (!tools.some((tool) => tool.name === TimeoutToolNames.cancel)) {
        tools.push({
            name: TimeoutToolNames.cancel,
            description:
                'Cancel one timeout by id or cancel all active timeouts across chats for the same user+agent scope.',
            parameters: {
                type: 'object',
                properties: {
                    timeoutId: {
                        type: 'string',
                        description: 'Identifier returned earlier by `set_timeout` or `list_timeouts`.',
                    },
                    allActive: {
                        type: 'boolean',
                        description: 'When true, cancel all currently active timeouts across chats in this user+agent scope.',
                    },
                },
            },
        });
    }

    if (!tools.some((tool) => tool.name === TimeoutToolNames.list)) {
        tools.push({
            name: TimeoutToolNames.list,
            description:
                'List timeout details across all chats for this same user+agent scope so they can be reviewed and managed.',
            parameters: {
                type: 'object',
                properties: {
                    includeFinished: {
                        type: 'boolean',
                        description:
                            'When true, include completed, failed, and cancelled rows in addition to active timeouts.',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of rows to return (default 20, max 100).',
                    },
                },
            },
        });
    }

    if (!tools.some((tool) => tool.name === TimeoutToolNames.update)) {
        tools.push({
            name: TimeoutToolNames.update,
            description:
                'Update one timeout (pause/resume, next run, recurrence, payload) or pause/resume all active queued timeouts across chats.',
            parameters: {
                type: 'object',
                properties: {
                    timeoutId: {
                        type: 'string',
                        description: 'Identifier returned earlier by `set_timeout` or `list_timeouts` for one timeout update.',
                    },
                    allActive: {
                        type: 'boolean',
                        description:
                            'When true, run one bulk pause/resume across all active queued timeouts in this same user+agent scope.',
                    },
                    paused: {
                        type: 'boolean',
                        description:
                            'Pause (`true`) or resume (`false`) one timeout; with `allActive: true` this pauses/resumes all active queued timeouts.',
                    },
                    dueAt: {
                        type: 'string',
                        description: 'Set the next run timestamp (ISO string). Cannot be used with `extendByMs`.',
                    },
                    extendByMs: {
                        type: 'number',
                        description: 'Move next run by this many milliseconds. Cannot be used with `dueAt`.',
                    },
                    recurrenceIntervalMs: {
                        type: 'number',
                        description: 'Set recurrence interval in milliseconds; pass `null` to disable recurrence.',
                    },
                    message: {
                        type: 'string',
                        description: 'Set wake-up message text for this timeout; pass empty string to clear.',
                    },
                    parameters: {
                        type: 'object',
                        description: 'Replace stored JSON parameters passed back when timeout fires.',
                    },
                },
            },
        });
    }

    return tools;
}
