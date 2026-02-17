import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';

/**
 * Tool name used to retrieve persisted user memory.
 *
 * @private internal MEMORY commitment constant
 */
const RETRIEVE_USER_MEMORY_TOOL_NAME = 'retrieve_user_memory' as string_javascript_name;

/**
 * Tool name used to store persisted user memory.
 *
 * @private internal MEMORY commitment constant
 */
const STORE_USER_MEMORY_TOOL_NAME = 'store_user_memory' as string_javascript_name;
const UPDATE_USER_MEMORY_TOOL_NAME = 'update_user_memory' as string_javascript_name;
const DELETE_USER_MEMORY_TOOL_NAME = 'delete_user_memory' as string_javascript_name;

/**
 * Tool arguments for retrieving memory.
 *
 * @private internal MEMORY commitment types
 */
type RetrieveMemoryToolArgs = {
    query?: string;
    limit?: number;
    [key: string]: TODO_any;
};

/**
 * Tool arguments for storing memory.
 *
 * @private internal MEMORY commitment types
 */
type StoreMemoryToolArgs = {
    content?: string;
    isGlobal?: boolean;
    [key: string]: TODO_any;
};

/**
 * Memory record returned by runtime adapters.
 *
 * @private internal MEMORY commitment types
 */
export type MemoryToolRecord = {
    id?: string;
    content: string;
    isGlobal: boolean;
    createdAt?: string;
    updatedAt?: string;
};

/**
 * Runtime context for MEMORY tools resolved from hidden tool arguments.
 *
 * @private internal MEMORY commitment types
 */
export type MemoryToolRuntimeContext = {
    readonly enabled: boolean;
    readonly userId?: number;
    readonly username?: string;
    readonly agentId?: string;
    readonly agentName?: string;
    readonly isTeamConversation: boolean;
    readonly isPrivateMode: boolean;
};

/**
 * Result payload returned by retrieve memory tool.
 *
 * @private internal MEMORY commitment types
 */
type RetrieveMemoryToolResult = {
    action: 'retrieve';
    status: 'ok' | 'disabled' | 'error';
    query?: string;
    memories: MemoryToolRecord[];
    message?: string;
};

/**
 * Result payload returned by store memory tool.
 *
 * @private internal MEMORY commitment types
 */
type StoreMemoryToolResult = {
    action: 'store';
    status: 'stored' | 'disabled' | 'error';
    memory?: MemoryToolRecord;
    message?: string;
};

/**
 * Tool arguments for updating memory.
 *
 * @private internal MEMORY commitment types
 */
type UpdateMemoryToolArgs = {
    memoryId?: string;
    content?: string;
    isGlobal?: boolean;
    [key: string]: TODO_any;
};

/**
 * Result payload returned by update memory tool.
 *
 * @private internal MEMORY commitment types
 */
type UpdateMemoryToolResult = {
    action: 'update';
    status: 'updated' | 'disabled' | 'error';
    memory?: MemoryToolRecord;
    message?: string;
};

/**
 * Tool arguments for deleting memory.
 *
 * @private internal MEMORY commitment types
 */
type DeleteMemoryToolArgs = {
    memoryId?: string;
    [key: string]: TODO_any;
};

/**
 * Result payload returned by delete memory tool.
 *
 * @private internal MEMORY commitment types
 */
type DeleteMemoryToolResult = {
    action: 'delete';
    status: 'deleted' | 'disabled' | 'error';
    memoryId?: string;
    message?: string;
};

type MemoryToolAction =
    | RetrieveMemoryToolResult['action']
    | StoreMemoryToolResult['action']
    | UpdateMemoryToolResult['action']
    | DeleteMemoryToolResult['action'];

/**
 * Runtime adapter interface used by MEMORY tools.
 *
 * @private internal MEMORY commitment types
 */
export type MemoryToolRuntimeAdapter = {
    retrieveMemories(
        args: {
            query?: string;
            limit?: number;
        },
        runtimeContext: MemoryToolRuntimeContext,
    ): Promise<MemoryToolRecord[]>;
    storeMemory(
        args: {
            content: string;
            isGlobal: boolean;
        },
        runtimeContext: MemoryToolRuntimeContext,
    ): Promise<MemoryToolRecord>;
    updateMemory(
        args: {
            memoryId: string;
            content: string;
            isGlobal?: boolean;
        },
        runtimeContext: MemoryToolRuntimeContext,
    ): Promise<MemoryToolRecord>;
    deleteMemory(
        args: {
            memoryId: string;
        },
        runtimeContext: MemoryToolRuntimeContext,
    ): Promise<{ id?: string }>;
};

/**
 * Runtime adapter used by MEMORY tool functions.
 *
 * @private internal mutable runtime wiring
 */
let memoryToolRuntimeAdapter: MemoryToolRuntimeAdapter | null = null;

/**
 * Sets runtime adapter used by MEMORY commitment tools.
 *
 * @private internal runtime wiring for MEMORY commitment
 */
export function setMemoryToolRuntimeAdapter(adapter: MemoryToolRuntimeAdapter | null): void {
    memoryToolRuntimeAdapter = adapter;
}

/**
 * Resolves runtime context from hidden tool arguments.
 *
 * @private utility of MEMORY commitment
 */
function resolveMemoryRuntimeContext(args: Record<string, TODO_any>): MemoryToolRuntimeContext {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args);
    const memoryContext = runtimeContext?.memory;

    return {
        enabled: memoryContext?.enabled === true,
        userId: memoryContext?.userId,
        username: memoryContext?.username,
        agentId: memoryContext?.agentId,
        agentName: memoryContext?.agentName,
        isTeamConversation: memoryContext?.isTeamConversation === true,
        isPrivateMode: memoryContext?.isPrivateMode === true,
    };
}

/**
 * Builds a disabled memory-tool response payload.
 *
 * @private utility of MEMORY commitment
 */
function createDisabledMemoryResult(
    action: MemoryToolAction,
    message: string,
): RetrieveMemoryToolResult | StoreMemoryToolResult | UpdateMemoryToolResult | DeleteMemoryToolResult {
    if (action === 'retrieve') {
        return {
            action,
            status: 'disabled',
            memories: [],
            message,
        };
    }

    if (action === 'store') {
        return {
            action,
            status: 'disabled',
            message,
        };
    }

    if (action === 'update') {
        return {
            action,
            status: 'disabled',
            message,
        };
    }

    if (action === 'delete') {
        return {
            action,
            status: 'disabled',
            message,
        };
    }

    throw new Error(`Unsupported memory tool action: ${action}`);
}

/**
 * Gets the runtime adapter and returns a disabled result when unavailable.
 *
 * @private utility of MEMORY commitment
 */
function getRuntimeAdapterOrDisabledResult(
    action: MemoryToolAction,
    runtimeContext: MemoryToolRuntimeContext,
): {
    adapter: MemoryToolRuntimeAdapter | null;
    disabledResult:
        | RetrieveMemoryToolResult
        | StoreMemoryToolResult
        | UpdateMemoryToolResult
        | DeleteMemoryToolResult
        | null;
} {
    if (!runtimeContext.enabled || runtimeContext.isTeamConversation || runtimeContext.isPrivateMode) {
        const message = runtimeContext.isPrivateMode
            ? 'Memory is disabled because private mode is active.'
            : runtimeContext.isTeamConversation
                ? 'Memory is disabled for TEAM conversations.'
                : 'Memory is disabled for unauthenticated users.';

        return {
            adapter: null,
            disabledResult: createDisabledMemoryResult(action, message),
        };
    }

    if (!memoryToolRuntimeAdapter) {
        return {
            adapter: null,
            disabledResult: createDisabledMemoryResult(action, 'Memory runtime is not available in this environment.'),
        };
    }

    return {
        adapter: memoryToolRuntimeAdapter,
        disabledResult: null,
    };
}

/**
 * Parses retrieve memory arguments.
 *
 * @private utility of MEMORY commitment
 */
function parseRetrieveMemoryArgs(args: RetrieveMemoryToolArgs): { query?: string; limit?: number } {
    const query = typeof args.query === 'string' ? args.query.trim() : undefined;
    const limit = typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : undefined;

    return {
        query: query && query.length > 0 ? query : undefined,
        limit: limit && limit > 0 ? Math.min(limit, 20) : undefined,
    };
}

/**
 * Parses store memory arguments.
 *
 * @private utility of MEMORY commitment
 */
function parseStoreMemoryArgs(args: StoreMemoryToolArgs): { content: string; isGlobal: boolean } {
    const content = typeof args.content === 'string' ? args.content.trim() : '';

    if (!content) {
        throw new Error('Memory content is required.');
    }

    return {
        content,
        isGlobal: args.isGlobal === true,
    };
}

/**
 * Parses a memory identifier argument shared across MEMORY tools.
 *
 * @private utility of MEMORY commitment
 */
function parseMemoryIdArg(value: unknown): string {
    const memoryId = typeof value === 'string' ? value.trim() : '';
    if (!memoryId) {
        throw new Error('Memory id is required.');
    }

    return memoryId;
}

/**
 * Parses update memory arguments.
 *
 * @private utility of MEMORY commitment
 */
function parseUpdateMemoryArgs(args: UpdateMemoryToolArgs): {
    memoryId: string;
    content: string;
    isGlobal?: boolean;
} {
    const memoryId = parseMemoryIdArg(args.memoryId);
    const content = typeof args.content === 'string' ? args.content.trim() : '';

    if (!content) {
        throw new Error('Memory content is required.');
    }

    const isGlobal = typeof args.isGlobal === 'boolean' ? args.isGlobal : undefined;

    return {
        memoryId,
        content,
        isGlobal,
    };
}

/**
 * Parses delete memory arguments.
 *
 * @private utility of MEMORY commitment
 */
function parseDeleteMemoryArgs(args: DeleteMemoryToolArgs): { memoryId: string } {
    return {
        memoryId: parseMemoryIdArg(args.memoryId),
    };
}

/**
 * MEMORY commitment definition
 *
 * The MEMORY commitment is similar to KNOWLEDGE but has a focus on remembering past
 * interactions and user preferences. It helps the agent maintain context about the
 * user's history, preferences, and previous conversations.
 *
 * Example usage in agent source:
 *
 * ```book
 * MEMORY User prefers detailed technical explanations
 * MEMORY Previously worked on React projects
 * MEMORY Timezone: UTC-5 (Eastern Time)
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MemoryCommitmentDefinition extends BaseCommitmentDefinition<'MEMORY' | 'MEMORIES'> {
    public constructor(type: 'MEMORY' | 'MEMORIES' = 'MEMORY') {
        super(type);
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of MEMORY.
     */
    get description(): string {
        return 'Remember past interactions and user **preferences** for personalized responses.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧠';
    }

    /**
     * Markdown documentation for MEMORY commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Enables persistent user memory for the current agent. The memory is stored by the runtime and can be retrieved in future conversations.

            ## Key aspects

            - Both \`MEMORY\` and \`MEMORIES\` work identically.
            - Stores user-specific details through runtime tools.
            - Retrieves relevant memories for personalized responses.
            - Supports optional extra instructions in the commitment content.

            ## Examples

            \`\`\`book
            Personal Assistant

            PERSONA You are a personal productivity assistant
            MEMORY Remember user projects and long-term preferences.
            GOAL Help optimize daily productivity and workflow
            \`\`\`

            \`\`\`book
            Learning Companion

            PERSONA You are an educational companion for programming students
            MEMORY Remember only the student's learning progress and preferred study style.
            GOAL Provide progressive learning experiences tailored to student's pace
            \`\`\`

            \`\`\`book
            Customer Support Agent

            PERSONA You are a customer support representative
            MEMORY Remember only important support history and communication preferences.
            GOAL Provide personalized support based on customer history
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Memory instructions', content);
        const existingTools = requirements.tools || [];

        const tools = [...existingTools];
        if (!tools.some((tool) => tool.name === RETRIEVE_USER_MEMORY_TOOL_NAME)) {
            tools.push({
                name: RETRIEVE_USER_MEMORY_TOOL_NAME,
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

        if (!tools.some((tool) => tool.name === STORE_USER_MEMORY_TOOL_NAME)) {
            tools.push({
                name: STORE_USER_MEMORY_TOOL_NAME,
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

        if (!tools.some((tool) => tool.name === UPDATE_USER_MEMORY_TOOL_NAME)) {
            tools.push({
                name: UPDATE_USER_MEMORY_TOOL_NAME,
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

        if (!tools.some((tool) => tool.name === DELETE_USER_MEMORY_TOOL_NAME)) {
            tools.push({
                name: DELETE_USER_MEMORY_TOOL_NAME,
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

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools,
                _metadata: {
                    ...requirements._metadata,
                    useMemory: content || true,
                },
            },
            spaceTrim(
                (block) => `
                    Memory:
                    - Prefer storing agent-scoped memories; only make them global when the fact should apply across all your agents.
                    - You can use persistent user memory tools.
                    - Use "${RETRIEVE_USER_MEMORY_TOOL_NAME}" to load relevant memory before answering.
                    - Use "${STORE_USER_MEMORY_TOOL_NAME}" to save stable user-specific facts that improve future help.
                    - Use "${UPDATE_USER_MEMORY_TOOL_NAME}" to refresh an existing memory when the content changes.
                    - Use "${DELETE_USER_MEMORY_TOOL_NAME}" to delete memories that are no longer accurate (deletions are soft and hidden from future queries).
                    - Store concise memory items and avoid duplicates.
                    - Never claim memory was saved or loaded unless the tool confirms it.
                    ${block(extraInstructions)}
                `,
            ),
        );
    }

    /**
     * Gets human-readable titles for MEMORY tool functions.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [RETRIEVE_USER_MEMORY_TOOL_NAME]: 'User memory',
            [STORE_USER_MEMORY_TOOL_NAME]: 'Store user memory',
            [UPDATE_USER_MEMORY_TOOL_NAME]: 'Update user memory',
            [DELETE_USER_MEMORY_TOOL_NAME]: 'Delete user memory',
        };
    }

    /**
     * Gets MEMORY tool function implementations.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async [RETRIEVE_USER_MEMORY_TOOL_NAME](args: RetrieveMemoryToolArgs): Promise<string> {
                const runtimeContext = resolveMemoryRuntimeContext(args);
                const { adapter, disabledResult } = getRuntimeAdapterOrDisabledResult('retrieve', runtimeContext);

                if (!adapter || disabledResult) {
                    return JSON.stringify(disabledResult);
                }

                const parsedArgs = parseRetrieveMemoryArgs(args);

                try {
                    const memories = await adapter.retrieveMemories(parsedArgs, runtimeContext);
                    const result: RetrieveMemoryToolResult = {
                        action: 'retrieve',
                        status: 'ok',
                        query: parsedArgs.query,
                        memories,
                    };
                    return JSON.stringify(result);
                } catch (error) {
                    const result: RetrieveMemoryToolResult = {
                        action: 'retrieve',
                        status: 'error',
                        query: parsedArgs.query,
                        memories: [],
                        message: error instanceof Error ? error.message : String(error),
                    };
                    return JSON.stringify(result);
                }
            },
            async [STORE_USER_MEMORY_TOOL_NAME](args: StoreMemoryToolArgs): Promise<string> {
                const runtimeContext = resolveMemoryRuntimeContext(args);
                const { adapter, disabledResult } = getRuntimeAdapterOrDisabledResult('store', runtimeContext);

                if (!adapter || disabledResult) {
                    return JSON.stringify(disabledResult);
                }

                try {
                    const parsedArgs = parseStoreMemoryArgs(args);
                    const memory = await adapter.storeMemory(parsedArgs, runtimeContext);
                    const result: StoreMemoryToolResult = {
                        action: 'store',
                        status: 'stored',
                        memory,
                    };
                    return JSON.stringify(result);
                } catch (error) {
                    const result: StoreMemoryToolResult = {
                        action: 'store',
                        status: 'error',
                        message: error instanceof Error ? error.message : String(error),
                    };
                    return JSON.stringify(result);
                }
            },
            async [UPDATE_USER_MEMORY_TOOL_NAME](args: UpdateMemoryToolArgs): Promise<string> {
                const runtimeContext = resolveMemoryRuntimeContext(args);
                const { adapter, disabledResult } = getRuntimeAdapterOrDisabledResult('update', runtimeContext);

                if (!adapter || disabledResult) {
                    return JSON.stringify(disabledResult);
                }

                try {
                    const parsedArgs = parseUpdateMemoryArgs(args);
                    const memory = await adapter.updateMemory(parsedArgs, runtimeContext);
                    const result: UpdateMemoryToolResult = {
                        action: 'update',
                        status: 'updated',
                        memory,
                    };
                    return JSON.stringify(result);
                } catch (error) {
                    const result: UpdateMemoryToolResult = {
                        action: 'update',
                        status: 'error',
                        message: error instanceof Error ? error.message : String(error),
                    };
                    return JSON.stringify(result);
                }
            },
            async [DELETE_USER_MEMORY_TOOL_NAME](args: DeleteMemoryToolArgs): Promise<string> {
                const runtimeContext = resolveMemoryRuntimeContext(args);
                const { adapter, disabledResult } = getRuntimeAdapterOrDisabledResult('delete', runtimeContext);

                if (!adapter || disabledResult) {
                    return JSON.stringify(disabledResult);
                }

                try {
                    const parsedArgs = parseDeleteMemoryArgs(args);
                    const deleted = await adapter.deleteMemory(parsedArgs, runtimeContext);
                    const result: DeleteMemoryToolResult = {
                        action: 'delete',
                        status: 'deleted',
                        memoryId: deleted.id,
                    };
                    return JSON.stringify(result);
                } catch (error) {
                    const result: DeleteMemoryToolResult = {
                        action: 'delete',
                        status: 'error',
                        message: error instanceof Error ? error.message : String(error),
                    };
                    return JSON.stringify(result);
                }
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
