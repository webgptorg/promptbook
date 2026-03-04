'use server';

import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import {
    setMemoryToolRuntimeAdapter,
    type MemoryToolRecord,
    type MemoryToolRuntimeContext,
} from '../../../../src/commitments/MEMORY/MEMORY';
import { OpenAiAgentKitExecutionTools } from '../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import { JavascriptExecutionTools } from '../../../../src/scripting/javascript/JavascriptExecutionTools';
import {
    createUserMemory,
    deleteUserMemory,
    findUserMemoryRecordById,
    listUserMemories,
    type UserMemoryRecord,
    updateUserMemory,
} from '../utils/userMemory';

/**
 * Cache of provided OpenAiAgentKitExecutionTools.
 *
 * @private internal cache for `$provideOpenAiAgentKitExecutionToolsForServer`
 */
let llmExecutionTools: null | OpenAiAgentKitExecutionTools = null;

/**
 * Converts user memory rows to tool records.
 */
function mapUserMemoryRecordToToolRecord(record: UserMemoryRecord): MemoryToolRecord {
    return {
        id: record.id.toString(),
        content: record.content,
        isGlobal: record.isGlobal,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
}

/**
 * Creates a memory runtime adapter backed by Agents Server database.
 */
function createMemoryRuntimeAdapter() {
    const parseMemoryId = (value: unknown): number => {
        const parsed = Number.parseInt(String(value ?? ''), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error('Memory id is required.');
        }
        return parsed;
    };

    const normalizeContent = (value: unknown): string => {
        const content = typeof value === 'string' ? value.trim() : '';
        if (!content) {
            throw new Error('Memory content is required.');
        }
        return content;
    };

    const ensureAgentPermanentId = (
        runtimeContext: MemoryToolRuntimeContext,
        fallback?: string | null,
    ): string => {
        if (runtimeContext.agentId) {
            return runtimeContext.agentId;
        }

        if (fallback) {
            return fallback;
        }

        throw new Error('Memory is unavailable because agent context is missing.');
    };

    return {
        async retrieveMemories(
            args: { query?: string; limit?: number },
            runtimeContext: MemoryToolRuntimeContext,
        ): Promise<MemoryToolRecord[]> {
            if (!runtimeContext.userId) {
                return [];
            }

            const records = await listUserMemories({
                userId: runtimeContext.userId,
                agentPermanentId: runtimeContext.agentId,
                includeGlobal: true,
                search: args.query,
                limit: args.limit ?? 5,
            });

            return records.map(mapUserMemoryRecordToToolRecord);
        },
        async storeMemory(
            args: { content: string; isGlobal: boolean },
            runtimeContext: MemoryToolRuntimeContext,
        ): Promise<MemoryToolRecord> {
            if (!runtimeContext.userId) {
                throw new Error('Memory is unavailable because user is not authenticated.');
            }

            const content = normalizeContent(args.content);
            const isGlobal = args.isGlobal === true;
            const agentPermanentId = isGlobal ? null : ensureAgentPermanentId(runtimeContext);

            const record = await createUserMemory({
                userId: runtimeContext.userId,
                content,
                isGlobal,
                agentPermanentId,
            });

            return mapUserMemoryRecordToToolRecord(record);
        },
        async updateMemory(
            args: { memoryId: unknown; content: unknown; isGlobal?: unknown },
            runtimeContext: MemoryToolRuntimeContext,
        ): Promise<MemoryToolRecord> {
            if (!runtimeContext.userId) {
                throw new Error('Memory is unavailable because user is not authenticated.');
            }

            const memoryId = parseMemoryId(args.memoryId);
            const content = normalizeContent(args.content);

            const existingMemory = await findUserMemoryRecordById({
                userId: runtimeContext.userId,
                memoryId,
            });

            if (!existingMemory) {
                throw new Error('Memory not found.');
            }

            if (
                !existingMemory.isGlobal &&
                existingMemory.agentPermanentId &&
                runtimeContext.agentId !== existingMemory.agentPermanentId
            ) {
                throw new Error('Memory belongs to another agent.');
            }

            const requestedGlobal = typeof args.isGlobal === 'boolean' ? args.isGlobal : undefined;
            const finalIsGlobal = requestedGlobal ?? existingMemory.isGlobal;

            let agentPermanentId: string | null = null;
            if (!finalIsGlobal) {
                agentPermanentId = ensureAgentPermanentId(runtimeContext, existingMemory.agentPermanentId);
            }

            const record = await updateUserMemory({
                userId: runtimeContext.userId,
                memoryId,
                content,
                isGlobal: finalIsGlobal,
                agentPermanentId,
            });

            return mapUserMemoryRecordToToolRecord(record);
        },
        async deleteMemory(
            args: { memoryId: unknown },
            runtimeContext: MemoryToolRuntimeContext,
        ): Promise<{ id?: string }> {
            if (!runtimeContext.userId) {
                throw new Error('Memory is unavailable because user is not authenticated.');
            }

            const memoryId = parseMemoryId(args.memoryId);
            const existingMemory = await findUserMemoryRecordById({
                userId: runtimeContext.userId,
                memoryId,
            });

            if (!existingMemory) {
                throw new Error('Memory not found.');
            }

            if (
                !existingMemory.isGlobal &&
                existingMemory.agentPermanentId &&
                runtimeContext.agentId !== existingMemory.agentPermanentId
            ) {
                throw new Error('Memory belongs to another agent.');
            }

            const deleted = await deleteUserMemory({
                userId: runtimeContext.userId,
                memoryId,
            });

            if (!deleted) {
                throw new Error('Memory not found.');
            }

            return { id: memoryId.toString() };
        },
    };
}

/**
 * Provides a cached OpenAiAgentKitExecutionTools instance for the Agents Server.
 */
export async function $provideOpenAiAgentKitExecutionToolsForServer(): Promise<OpenAiAgentKitExecutionTools> {
    setMemoryToolRuntimeAdapter(createMemoryRuntimeAdapter());

    const isVerbose = true; // <- TODO: [🤰] Pass

    if (llmExecutionTools !== null) {
        console.log('[🤰] Returning cached OpenAiAgentKitExecutionTools');
        return llmExecutionTools;
        // TODO: [🤰] Be aware of options changes
    }

    console.log('[🤰] Creating NEW OpenAiAgentKitExecutionTools');

    llmExecutionTools = new OpenAiAgentKitExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
        executionTools: {
            script: new JavascriptExecutionTools({
                isVerbose,
                functions: getAllCommitmentsToolFunctionsForNode(),
            }),
        },
        isVerbose,
    });

    return llmExecutionTools;
}

/**
 * TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
 */
