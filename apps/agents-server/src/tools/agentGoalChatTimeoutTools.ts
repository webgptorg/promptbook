import type { LlmToolDefinition } from '../../../../src/types/LlmToolDefinition';

/**
 * Tool names used by the agent-owned planned-message capability.
 */
export const AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES = {
    set: 'set_timeout',
    update: 'update_timeout',
    list: 'list_timeouts',
    cancel: 'cancel_timeout',
} as const;

/**
 * Schedule parameters shared by the planning and re-planning tools.
 *
 * One planned message follows exactly one recurrence rule, bounded by an optional date window and an
 * optional total number of runs, so both tools describe the very same fields.
 */
const AGENT_GOAL_CHAT_TIMEOUT_SCHEDULE_PARAMETERS = {
    milliseconds: {
        type: 'number',
        description:
            'Repeat interval in milliseconds between two wake-ups by this planned message (at least 60000). Use either this or `cronExpression`.',
    },
    cronExpression: {
        type: 'string',
        description:
            'Five-field cron expression such as `0 9 * * 1-5`, evaluated in the server time zone. Use either this or `milliseconds`.',
    },
    maxRunCount: {
        type: 'number',
        description:
            'How many times in total this planned message wakes you, for example 1 for a one-off message. Leave it out to repeat until cancelled.',
    },
    startsAt: {
        type: 'string',
        description:
            'ISO date before which the planned message never wakes you, for example `2026-09-01T08:00:00.000Z`.',
    },
    endsAt: {
        type: 'string',
        description: 'ISO date after which the planned message stops waking you and finishes on its own.',
    },
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
                'Plan a message that wakes you in your singleton goal chat, like `setInterval`. Use this for useful autonomous follow-up towards your current goal; the wake-up is not tied to the human conversation where you schedule it, and it keeps repeating until its schedule is over or you cancel it. Do not plan a message that matches one you already planned.',
            parameters: {
                type: 'object',
                properties: {
                    ...AGENT_GOAL_CHAT_TIMEOUT_SCHEDULE_PARAMETERS,
                    message: {
                        type: 'string',
                        description:
                            'The concrete future instruction or reminder that will be delivered in your goal chat.',
                    },
                },
                required: ['message'],
                additionalProperties: false,
            },
        });
    }

    if (!tools.some((tool) => tool.name === AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.update)) {
        tools.push({
            name: AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.update,
            description:
                'Change the schedule or the text of one planned goal-chat message without losing its identity. Pass only the fields you want to change; every other field keeps its current value, and `null` removes a bound such as `endsAt`. Prefer this over cancelling and planning the same message again.',
            parameters: {
                type: 'object',
                properties: {
                    timeoutId: {
                        type: 'string',
                        description: 'Identifier returned by `set_timeout` or `list_timeouts`.',
                    },
                    ...AGENT_GOAL_CHAT_TIMEOUT_SCHEDULE_PARAMETERS,
                    message: {
                        type: 'string',
                        description: 'New instruction delivered by this planned message in your goal chat.',
                    },
                },
                required: ['timeoutId'],
                additionalProperties: false,
            },
        });
    }

    if (!tools.some((tool) => tool.name === AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.list)) {
        tools.push({
            name: AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.list,
            description:
                'List your planned goal-chat messages, including their identifiers, whole schedules, and next execution times, across every conversation in which you were invoked. Messages which already finished are left out. Keep the listed messages as they are unless they no longer match your goal.',
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
                'Stop one planned goal-chat message by its timeout identifier, which also stops all of its remaining repetitions. List planned messages first when the identifier is not known.',
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
