import type {
    DeleteMemoryToolArgs,
    RetrieveMemoryToolArgs,
    StoreMemoryToolArgs,
    UpdateMemoryToolArgs,
} from './MemoryToolRuntimeAdapter';

/**
 * Parsed retrieve memory arguments.
 *
 * @private type of MemoryCommitmentDefinition
 */
type ParsedRetrieveMemoryArgs = {
    query?: string;
    limit?: number;
};

/**
 * Parsed store memory arguments.
 *
 * @private type of MemoryCommitmentDefinition
 */
type ParsedStoreMemoryArgs = {
    content: string;
    isGlobal: boolean;
};

/**
 * Parsed update memory arguments.
 *
 * @private type of MemoryCommitmentDefinition
 */
type ParsedUpdateMemoryArgs = {
    memoryId: string;
    content: string;
    isGlobal?: boolean;
};

/**
 * Parsed delete memory arguments.
 *
 * @private type of MemoryCommitmentDefinition
 */
type ParsedDeleteMemoryArgs = {
    memoryId: string;
};

/**
 * Parses a memory identifier argument shared across MEMORY tools.
 *
 * @private function of MemoryCommitmentDefinition
 */
function parseMemoryIdArg(value: unknown): string {
    const memoryId = typeof value === 'string' ? value.trim() : '';
    if (!memoryId) {
        throw new Error('Memory id is required.');
    }

    return memoryId;
}

/**
 * Collection of MEMORY tool argument parsers.
 *
 * @private function of MemoryCommitmentDefinition
 */
export const parseMemoryToolArgs = {
    /**
     * Parses retrieve memory arguments.
     */
    retrieve(args: RetrieveMemoryToolArgs): ParsedRetrieveMemoryArgs {
        const query = typeof args.query === 'string' ? args.query.trim() : undefined;
        const limit =
            typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : undefined;

        return {
            query: query && query.length > 0 ? query : undefined,
            limit: limit && limit > 0 ? Math.min(limit, 20) : undefined,
        };
    },

    /**
     * Parses store memory arguments.
     */
    store(args: StoreMemoryToolArgs): ParsedStoreMemoryArgs {
        const content = typeof args.content === 'string' ? args.content.trim() : '';

        if (!content) {
            throw new Error('Memory content is required.');
        }

        return {
            content,
            isGlobal: args.isGlobal === true,
        };
    },

    /**
     * Parses update memory arguments.
     */
    update(args: UpdateMemoryToolArgs): ParsedUpdateMemoryArgs {
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
    },

    /**
     * Parses delete memory arguments.
     */
    delete(args: DeleteMemoryToolArgs): ParsedDeleteMemoryArgs {
        return {
            memoryId: parseMemoryIdArg(args.memoryId),
        };
    },
};
