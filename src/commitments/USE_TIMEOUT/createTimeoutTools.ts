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
            description: 'Cancel one previously scheduled timeout in the current chat thread.',
            parameters: {
                type: 'object',
                properties: {
                    timeoutId: {
                        type: 'string',
                        description: 'Identifier returned earlier by `set_timeout`.',
                    },
                },
                required: ['timeoutId'],
            },
        });
    }

    return tools;
}
