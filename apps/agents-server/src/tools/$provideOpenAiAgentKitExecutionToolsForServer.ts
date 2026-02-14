'use server';

import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import {
    setMemoryToolRuntimeAdapter,
    type MemoryToolRecord,
    type MemoryToolRuntimeContext,
} from '../../../../src/commitments/MEMORY/MEMORY';
import { OpenAiAgentKitExecutionTools } from '../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import { JavascriptExecutionTools } from '../../../../src/scripting/javascript/JavascriptExecutionTools';
import { createUserMemory, listUserMemories, type UserMemoryRecord } from '../utils/userMemory';

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

            const record = await createUserMemory({
                userId: runtimeContext.userId,
                content: args.content,
                isGlobal: args.isGlobal,
                agentPermanentId: runtimeContext.agentId,
            });

            return mapUserMemoryRecordToToolRecord(record);
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
