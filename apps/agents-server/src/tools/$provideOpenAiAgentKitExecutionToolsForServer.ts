'use server';

import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import {
    setMemoryToolRuntimeAdapter,
    type MemoryToolRecord,
    type MemoryToolRuntimeContext,
} from '../../../../src/commitments/MEMORY/MEMORY';
import {
    setWalletToolRuntimeAdapter,
    type WalletToolRecord,
    type WalletToolRuntimeContext,
} from '../../../../src/commitments/WALLET/WALLET';
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
import {
    createUserWalletRecord,
    deleteUserWalletRecord,
    findUserWalletRecordById,
    listUserWalletRecords,
    type UserWalletRecord,
    type UserWalletRecordType,
    updateUserWalletRecord,
} from '../utils/userWallet';

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
 * Converts user wallet rows to tool records.
 */
function mapUserWalletRecordToToolRecord(record: UserWalletRecord): WalletToolRecord {
    return {
        id: record.id.toString(),
        recordType: record.recordType,
        service: record.service,
        key: record.key,
        username: record.username,
        password: record.password,
        secret: record.secret,
        cookies: record.cookies,
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
 * Creates a wallet runtime adapter backed by Agents Server database.
 */
function createWalletRuntimeAdapter() {
    const parseWalletId = (value: unknown): number => {
        const parsed = Number.parseInt(String(value ?? ''), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error('Wallet id is required.');
        }
        return parsed;
    };

    const ensureAgentPermanentId = (
        runtimeContext: WalletToolRuntimeContext,
        fallback?: string | null,
    ): string => {
        if (runtimeContext.agentId) {
            return runtimeContext.agentId;
        }
        if (fallback) {
            return fallback;
        }
        throw new Error('Wallet is unavailable because agent context is missing.');
    };

    return {
        async retrieveWalletRecords(
            args: {
                query?: string;
                recordType?: UserWalletRecordType;
                service?: string;
                key?: string;
                limit?: number;
            },
            runtimeContext: WalletToolRuntimeContext,
        ): Promise<WalletToolRecord[]> {
            if (!runtimeContext.userId) {
                return [];
            }

            const records = await listUserWalletRecords({
                userId: runtimeContext.userId,
                agentPermanentId: runtimeContext.agentId,
                includeGlobal: true,
                search: args.query,
                recordType: args.recordType,
                service: args.service,
                key: args.key,
                limit: args.limit ?? 5,
            });

            return records.map(mapUserWalletRecordToToolRecord);
        },
        async storeWalletRecord(
            args: WalletToolRecord,
            runtimeContext: WalletToolRuntimeContext,
        ): Promise<WalletToolRecord> {
            if (!runtimeContext.userId) {
                throw new Error('Wallet is unavailable because user is not authenticated.');
            }

            const isGlobal = args.isGlobal === true;
            const agentPermanentId = isGlobal ? null : ensureAgentPermanentId(runtimeContext);

            const record = await createUserWalletRecord({
                userId: runtimeContext.userId,
                agentPermanentId,
                isGlobal,
                recordType: args.recordType,
                service: args.service,
                key: args.key,
                username: args.username || undefined,
                password: args.password || undefined,
                secret: args.secret || undefined,
                cookies: args.cookies || undefined,
            });

            return mapUserWalletRecordToToolRecord(record);
        },
        async updateWalletRecord(
            args: WalletToolRecord & { walletId: string },
            runtimeContext: WalletToolRuntimeContext,
        ): Promise<WalletToolRecord> {
            if (!runtimeContext.userId) {
                throw new Error('Wallet is unavailable because user is not authenticated.');
            }

            const walletId = parseWalletId(args.walletId);
            const existingRecord = await findUserWalletRecordById({
                userId: runtimeContext.userId,
                walletId,
            });

            if (!existingRecord) {
                throw new Error('Wallet record not found.');
            }

            if (
                !existingRecord.isGlobal &&
                existingRecord.agentPermanentId &&
                runtimeContext.agentId !== existingRecord.agentPermanentId
            ) {
                throw new Error('Wallet record belongs to another agent.');
            }

            const isGlobal = args.isGlobal === true;
            const agentPermanentId = isGlobal
                ? null
                : ensureAgentPermanentId(runtimeContext, existingRecord.agentPermanentId);

            const record = await updateUserWalletRecord({
                userId: runtimeContext.userId,
                walletId,
                agentPermanentId,
                isGlobal,
                recordType: args.recordType,
                service: args.service,
                key: args.key,
                username: args.username || undefined,
                password: args.password || undefined,
                secret: args.secret || undefined,
                cookies: args.cookies || undefined,
            });

            return mapUserWalletRecordToToolRecord(record);
        },
        async deleteWalletRecord(
            args: { walletId: string },
            runtimeContext: WalletToolRuntimeContext,
        ): Promise<{ id?: string }> {
            if (!runtimeContext.userId) {
                throw new Error('Wallet is unavailable because user is not authenticated.');
            }

            const walletId = parseWalletId(args.walletId);
            const existingRecord = await findUserWalletRecordById({
                userId: runtimeContext.userId,
                walletId,
            });

            if (!existingRecord) {
                throw new Error('Wallet record not found.');
            }

            if (
                !existingRecord.isGlobal &&
                existingRecord.agentPermanentId &&
                runtimeContext.agentId !== existingRecord.agentPermanentId
            ) {
                throw new Error('Wallet record belongs to another agent.');
            }

            const deleted = await deleteUserWalletRecord({
                userId: runtimeContext.userId,
                walletId,
            });

            if (!deleted) {
                throw new Error('Wallet record not found.');
            }

            return { id: walletId.toString() };
        },
    };
}

/**
 * Provides a cached OpenAiAgentKitExecutionTools instance for the Agents Server.
 */
export async function $provideOpenAiAgentKitExecutionToolsForServer(): Promise<OpenAiAgentKitExecutionTools> {
    setMemoryToolRuntimeAdapter(createMemoryRuntimeAdapter());
    setWalletToolRuntimeAdapter(createWalletRuntimeAdapter());

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
