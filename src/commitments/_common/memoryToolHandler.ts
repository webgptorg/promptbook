import type { string_name } from '../../types/typeAliases';

/**
 * User memory entry returned by the memory tool handler.
 */
export type MemoryToolEntry = {
    /** Title used to identify the memory. */
    readonly title: string;

    /** Text content describing the memory. */
    readonly content: string;

    /** Whether this memory is shared across all agents. */
    readonly isGlobal: boolean;

    /** Optional agent name this memory belongs to. */
    readonly agentName?: string | null;

    /** Optional permanent identifier of the agent this memory belongs to. */
    readonly agentPermanentId?: string | null;

    /** Optional numeric database identifier of the agent. */
    readonly agentId?: number | null;

    /** Timestamp of when the memory was last updated. */
    readonly updatedAt?: string;
};

/**
 * Arguments passed when storing a memory entry.
 */
export type MemoryToolStoreArgs = {
    /** Memory title used for later retrieval. */
    readonly title: string;

    /** Actual content to remember. */
    readonly content: string;

    /** When true, this memory is available for all agents. */
    readonly isGlobal?: boolean;
};

/**
 * Arguments passed when retrieving memory entries.
 */
export type MemoryToolRetrieveArgs = {
    /** Optional title to filter specific memories. */
    readonly title?: string;

    /** Include global memories along with agent-specific ones (default true). */
    readonly includeGlobal?: boolean;

    /** Maximum number of entries to return. */
    readonly limit?: number;
};

/**
 * Result returned by a memory tool operation.
 */
export type MemoryToolHandlerResult = {
    /** Indicates whether the tool call succeeded. */
    readonly success: boolean;

    /** Human-friendly message describing the result. */
    readonly message?: string;

    /** Memories returned by the handler. */
    readonly memories?: ReadonlyArray<MemoryToolEntry>;
};

/**
 * Handler used by the memory tools supplied to the agent.
 */
export interface MemoryToolHandler {
    /** Stores or updates a single memory entry. */
    store(args: MemoryToolStoreArgs): Promise<MemoryToolHandlerResult>;

    /** Retrieves memories matching the provided filters. */
    retrieve(args: MemoryToolRetrieveArgs): Promise<MemoryToolHandlerResult>;
}

/**
 * Registered handler exposed to the commitment implementation.
 */
let handler: MemoryToolHandler | null = null;

/**
 * Registers the memory tool handler used by MEMORY commitment tool functions.
 */
export function setMemoryToolHandler(value: MemoryToolHandler | null): void {
    handler = value;
}

/**
 * Gets the currently registered memory tool handler.
 */
export function getMemoryToolHandler(): MemoryToolHandler | null {
    return handler;
}
