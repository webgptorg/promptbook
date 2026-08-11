import type { LlmToolDefinition } from '../../../../src/types/LlmToolDefinition';

/**
 * Tool names used by the agent-owned planned-message capability.
 */
export const AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES = {
    set: 'set_timeout',
    list: 'list_timeouts',
    cancel: 'cancel_timeout',
} as const;

/**
 * Adds the Agents Server planned-message tools while preserving already registered tools.
 *
 * Planned messages always belong to the agent's singleton goal chat. This lets an agent plan
 * follow-up work from any conversation without tying the future wake-up to a human's thread.
 *
 * @param existingTools - Tool definitions already available in the current chat runtime.
 * @returns Tool definitions including planned-message scheduling, listing, and cancellation.
 */
export function createAgentGoalChatTimeoutTools(
    existingTools: ReadonlyArray<LlmToolDefinition> = [],
): Array<LlmToolDefinition> {
    const tools = [...existingTools];

    if (!tools.some((tool) => tool.name === AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.set)) {
        tools.push({
            name: AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.set,
            description:
                'Plan a message that will wake you in your singleton goal chat after a delay. Use this for useful autonomous follow-up towards your current goal; the wake-up is not tied to the human conversation where you schedule it.',
            parameters: {
                type: 'object',
                properties: {
                    milliseconds: {
                        type: 'number',
                        description: 'Positive delay in milliseconds before the planned message wakes you.',
                    },
                    message: {
                        type: 'string',
                        description:
                            'The concrete future instruction or reminder that will be delivered in your goal chat.',
                    },
                },
                required: ['milliseconds', 'message'],
                additionalProperties: false,
            },
        });
    }

    if (!tools.some((tool) => tool.name === AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.list)) {
        tools.push({
            name: AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.list,
            description:
                'List your planned goal-chat messages, including their identifiers and execution times, across every conversation in which you were invoked.',
            parameters: {
                type: 'object',
                properties: {
                    isIncludingFinished: {
                        type: 'boolean',
                        description: 'Set to true only when completed, failed, and cancelled messages are also needed.',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of planned messages to return (default 20, maximum 100).',
                    },
                },
                additionalProperties: false,
            },
        });
    }

    if (!tools.some((tool) => tool.name === AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.cancel)) {
        tools.push({
            name: AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.cancel,
            description:
                'Cancel one planned goal-chat message by its timeout identifier. List planned messages first when the identifier is not known.',
            parameters: {
                type: 'object',
                properties: {
                    timeoutId: {
                        type: 'string',
                        description: 'Identifier returned by `set_timeout` or `list_timeouts`.',
                    },
                },
                required: ['timeoutId'],
                additionalProperties: false,
            },
        });
    }

    return tools;
}
