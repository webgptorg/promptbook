import type { TODO_any } from '../../_packages/types.index';

/**
 * Tool arguments for retrieving memory.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type RetrieveMemoryToolArgs = {
    query?: string;
    limit?: number;
    [key: string]: TODO_any;
};

/**
 * Tool arguments for storing memory.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type StoreMemoryToolArgs = {
    content?: string;
    isGlobal?: boolean;
    [key: string]: TODO_any;
};

/**
 * Tool arguments for updating memory.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type UpdateMemoryToolArgs = {
    memoryId?: string;
    content?: string;
    isGlobal?: boolean;
    [key: string]: TODO_any;
};

/**
 * Tool arguments for deleting memory.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type DeleteMemoryToolArgs = {
    memoryId?: string;
    [key: string]: TODO_any;
};

/**
 * Memory record returned by runtime adapters.
 *
 * @private type of MemoryCommitmentDefinition
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
 * @private type of MemoryCommitmentDefinition
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
 * @private type of MemoryCommitmentDefinition
 */
export type RetrieveMemoryToolResult = {
    action: 'retrieve';
    status: 'ok' | 'disabled' | 'error';
    query?: string;
    memories: MemoryToolRecord[];
    message?: string;
};

/**
 * Result payload returned by store memory tool.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type StoreMemoryToolResult = {
    action: 'store';
    status: 'stored' | 'disabled' | 'error';
    memory?: MemoryToolRecord;
    message?: string;
};

/**
 * Result payload returned by update memory tool.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type UpdateMemoryToolResult = {
    action: 'update';
    status: 'updated' | 'disabled' | 'error';
    memory?: MemoryToolRecord;
    message?: string;
};

/**
 * Result payload returned by delete memory tool.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type DeleteMemoryToolResult = {
    action: 'delete';
    status: 'deleted' | 'disabled' | 'error';
    memoryId?: string;
    message?: string;
};

/**
 * Union of all MEMORY tool actions.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type MemoryToolAction =
    | RetrieveMemoryToolResult['action']
    | StoreMemoryToolResult['action']
    | UpdateMemoryToolResult['action']
    | DeleteMemoryToolResult['action'];

/**
 * Union of all MEMORY tool result payloads.
 *
 * @private type of MemoryCommitmentDefinition
 */
export type MemoryToolResult =
    | RetrieveMemoryToolResult
    | StoreMemoryToolResult
    | UpdateMemoryToolResult
    | DeleteMemoryToolResult;

/**
 * Runtime adapter interface used by MEMORY tools.
 *
 * @private type of MemoryCommitmentDefinition
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
