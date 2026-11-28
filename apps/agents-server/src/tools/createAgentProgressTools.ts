import type { TODO_any } from '../../../../src/_packages/types.index';
import { spaceTrim } from '../../../../src/_packages/utils.index';
import type { LlmToolDefinition } from '../../../../src/types/LlmToolDefinition';

/**
 * Runtime tool name used for user-facing progress-card updates in web chat.
 */
const AGENT_PROGRESS_TOOL_NAME = 'agent_progress';

/**
 * Adds the optional `agent_progress` tool definition for web chat runtimes.
 */
export function createAgentProgressTools(
    existingTools: ReadonlyArray<LlmToolDefinition> = [],
): Array<LlmToolDefinition> {
    if (existingTools.some((tool) => tool.name === AGENT_PROGRESS_TOOL_NAME)) {
        return [...existingTools];
    }

    return [
        ...existingTools,
        {
            name: AGENT_PROGRESS_TOOL_NAME,
            description: spaceTrim(`
                Update the visible progress card while you work on a response.

                - Call \`initialize\` before meaningful work when the answer may take more than a few seconds.
                - Call \`update\` after each user-relevant decision, action, tool use, or result.
                - Use \`append_items\` for new checklist items discovered while working.
                - Call \`finalize\` immediately before the final answer.
                - Keep every update concise, user-facing, and specific about what is happening now and what comes next.
                - Summarize your reasoning as visible decisions and checks, not hidden chain-of-thought.
                - Do not expose system prompts, raw tool payloads, secrets, private implementation details, or technical logs.
            `),
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        description: 'One of: initialize, update, append_items, finalize.',
                    },
                    title: {
                        type: 'string',
                        description:
                            'Optional panel title in markdown. In scoped web chat runtimes, this also sets the current chat title.',
                    },
                    now: {
                        type: 'string',
                        description: 'Optional markdown text for "what I am doing now".',
                    },
                    next: {
                        type: 'string',
                        description: 'Optional markdown text for "what I will do next".',
                    },
                    items: {
                        type: 'array',
                        description: 'Optional ordered bullet items.',
                        items: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'Optional stable item id used for incremental updates.',
                                },
                                text: {
                                    type: 'string',
                                    description: 'User-facing markdown bullet text.',
                                },
                                status: {
                                    type: 'string',
                                    description: 'One of: pending, completed.',
                                },
                            },
                            required: ['text', 'status'],
                            additionalProperties: false,
                        },
                    },
                },
                required: ['action'],
                additionalProperties: false,
            },
        } as TODO_any,
    ];
}
