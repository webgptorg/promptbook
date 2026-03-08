import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { MemoryToolNames } from './MemoryToolNames';

/**
 * Concrete type of tool definitions in `AgentModelRequirements`.
 *
 * @private type of MemoryCommitmentDefinition
 */
type AgentModelTools = NonNullable<AgentModelRequirements['tools']>;

/**
 * Creates MEMORY tool definitions while preserving already-registered tools.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function createMemoryTools(existingTools: AgentModelRequirements['tools']): AgentModelTools {
    const tools = [...(existingTools || [])];

    if (!tools.some((tool) => tool.name === MemoryToolNames.retrieve)) {
        tools.push({
            name: MemoryToolNames.retrieve,
            description: spaceTrim(`
                Retrieve previously stored user memories relevant to the current conversation.
                Use this before responding when user context can improve the answer.
            `),
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Optional query used to filter relevant memories.',
                    },
                    limit: {
                        type: 'integer',
                        description: 'Optional maximum number of memories to return (default 5, max 20).',
                    },
                },
            },
        });
    }

    if (!tools.some((tool) => tool.name === MemoryToolNames.store)) {
        tools.push({
            name: MemoryToolNames.store,
            description: spaceTrim(`
                Store a durable user memory that should be remembered in future conversations.
                Store only stable and useful user-specific facts or preferences.
            `),
            parameters: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: 'Memory text to store.',
                    },
                    isGlobal: {
                        type: 'boolean',
                        description: 'Set true to make this memory global across all user agents.',
                    },
                },
                required: ['content'],
            },
        });
    }

    if (!tools.some((tool) => tool.name === MemoryToolNames.update)) {
        tools.push({
            name: MemoryToolNames.update,
            description: spaceTrim(`
                Update an existing user memory after retrieving it, so the stored fact stays accurate.
                Always pass the memory id you retrieved along with the new content.
            `),
            parameters: {
                type: 'object',
                properties: {
                    memoryId: {
                        type: 'string',
                        description: 'Unique identifier of the memory entry to update.',
                    },
                    content: {
                        type: 'string',
                        description: 'Updated memory text.',
                    },
                    isGlobal: {
                        type: 'boolean',
                        description: 'Set true to keep the fact global; omit or false to keep it agent-scoped.',
                    },
                },
                required: ['memoryId', 'content'],
            },
        });
    }

    if (!tools.some((tool) => tool.name === MemoryToolNames.delete)) {
        tools.push({
            name: MemoryToolNames.delete,
            description: spaceTrim(`
                Delete a user memory that is no longer relevant. Deletions are soft so the record is hidden from future queries.
            `),
            parameters: {
                type: 'object',
                properties: {
                    memoryId: {
                        type: 'string',
                        description: 'Unique identifier of the memory entry to delete.',
                    },
                },
                required: ['memoryId'],
            },
        });
    }

    return tools;
}
