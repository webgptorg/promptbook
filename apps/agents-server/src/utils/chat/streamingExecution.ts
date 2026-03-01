import { $provideClientSql } from '@/src/database/$provideClientSql';
import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { $getCurrentDate } from '@promptbook-local/utils';

/**
 * Status of a streaming execution
 *
 * @public exported from Agents Server utils
 */
export type StreamingExecutionStatus = 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Streaming execution record
 *
 * @public exported from Agents Server utils
 */
export type StreamingExecution = {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly completedAt: Date | null;
    readonly status: StreamingExecutionStatus;
    readonly userId: number | null;
    readonly userChatId: string | null;
    readonly agentPermanentId: string;
    readonly agentName: string;
    readonly agentHash: string;
    readonly userMessage: ChatMessage;
    readonly assistantMessage: ChatMessage | null;
    readonly assistantMessageDelta: string;
    readonly toolCalls: ReadonlyArray<ToolCall> | null;
    readonly usage: Record<string, unknown> | null;
    readonly error: Record<string, unknown> | null;
    readonly userMessageHash: string | null;
    readonly assistantMessageHash: string | null;
};

/**
 * Creates a new streaming execution record
 *
 * @public exported from Agents Server utils
 */
export async function createStreamingExecution(params: {
    userId: number | null;
    userChatId: string | null;
    agentPermanentId: string;
    agentName: string;
    agentHash: string;
    userMessage: ChatMessage;
    userMessageHash: string | null;
}): Promise<StreamingExecution> {
    const { userId, userChatId, agentPermanentId, agentName, agentHash, userMessage, userMessageHash } = params;

    const executionId = crypto.randomUUID();
    const now = $getCurrentDate();

    const sql = await $provideClientSql();

    const [execution] = await sql<StreamingExecution[]>`
        INSERT INTO "ChatStreamingExecution" (
            "id",
            "createdAt",
            "updatedAt",
            "status",
            "userId",
            "userChatId",
            "agentPermanentId",
            "agentName",
            "agentHash",
            "userMessage",
            "userMessageHash"
        ) VALUES (
            ${executionId},
            ${now},
            ${now},
            ${'PENDING'},
            ${userId},
            ${userChatId},
            ${agentPermanentId},
            ${agentName},
            ${agentHash},
            ${JSON.stringify(userMessage)},
            ${userMessageHash}
        )
        RETURNING *
    `;

    return {
        ...execution,
        userMessage:
            typeof execution.userMessage === 'string' ? JSON.parse(execution.userMessage) : execution.userMessage,
        assistantMessage: null,
        toolCalls: null,
        usage: null,
        error: null,
    };
}

/**
 * Updates streaming execution with delta content
 *
 * @public exported from Agents Server utils
 */
export async function updateStreamingExecutionDelta(
    executionId: string,
    delta: string,
    toolCalls?: ReadonlyArray<ToolCall>,
): Promise<void> {
    const sql = await $provideClientSql();
    const now = $getCurrentDate();

    if (toolCalls) {
        await sql`
            UPDATE "ChatStreamingExecution"
            SET
                "assistantMessageDelta" = "assistantMessageDelta" || ${delta},
                "toolCalls" = ${JSON.stringify(toolCalls)},
                "updatedAt" = ${now},
                "status" = CASE WHEN "status" = 'PENDING' THEN 'STREAMING' ELSE "status" END
            WHERE "id" = ${executionId}
        `;
    } else {
        await sql`
            UPDATE "ChatStreamingExecution"
            SET
                "assistantMessageDelta" = "assistantMessageDelta" || ${delta},
                "updatedAt" = ${now},
                "status" = CASE WHEN "status" = 'PENDING' THEN 'STREAMING' ELSE "status" END
            WHERE "id" = ${executionId}
        `;
    }
}

/**
 * Completes a streaming execution with final message
 *
 * @public exported from Agents Server utils
 */
export async function completeStreamingExecution(params: {
    executionId: string;
    assistantMessage: ChatMessage;
    assistantMessageHash: string | null;
    usage?: Record<string, unknown>;
    toolCalls?: ReadonlyArray<ToolCall>;
}): Promise<void> {
    const { executionId, assistantMessage, assistantMessageHash, usage, toolCalls } = params;

    const sql = await $provideClientSql();
    const now = $getCurrentDate();

    await sql`
        UPDATE "ChatStreamingExecution"
        SET
            "assistantMessage" = ${JSON.stringify(assistantMessage)},
            "assistantMessageHash" = ${assistantMessageHash},
            "usage" = ${usage ? JSON.stringify(usage) : null},
            "toolCalls" = ${toolCalls ? JSON.stringify(toolCalls) : null},
            "status" = ${'COMPLETED'},
            "completedAt" = ${now},
            "updatedAt" = ${now}
        WHERE "id" = ${executionId}
    `;
}

/**
 * Marks a streaming execution as failed
 *
 * @public exported from Agents Server utils
 */
export async function failStreamingExecution(
    executionId: string,
    error: Error | Record<string, unknown>,
): Promise<void> {
    const sql = await $provideClientSql();
    const now = $getCurrentDate();

    const errorData = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;

    await sql`
        UPDATE "ChatStreamingExecution"
        SET
            "error" = ${JSON.stringify(errorData)},
            "status" = ${'FAILED'},
            "completedAt" = ${now},
            "updatedAt" = ${now}
        WHERE "id" = ${executionId}
    `;
}

/**
 * Marks a streaming execution as cancelled
 *
 * @public exported from Agents Server utils
 */
export async function cancelStreamingExecution(executionId: string): Promise<void> {
    const sql = await $provideClientSql();
    const now = $getCurrentDate();

    await sql`
        UPDATE "ChatStreamingExecution"
        SET
            "status" = ${'CANCELLED'},
            "completedAt" = ${now},
            "updatedAt" = ${now}
        WHERE "id" = ${executionId}
        AND "status" IN ('PENDING', 'STREAMING')
    `;
}

/**
 * Gets a streaming execution by ID
 *
 * @public exported from Agents Server utils
 */
export async function getStreamingExecution(executionId: string): Promise<StreamingExecution | null> {
    const sql = await $provideClientSql();

    const [execution] = await sql<StreamingExecution[]>`
        SELECT * FROM "ChatStreamingExecution"
        WHERE "id" = ${executionId}
    `;

    if (!execution) {
        return null;
    }

    return {
        ...execution,
        userMessage:
            typeof execution.userMessage === 'string' ? JSON.parse(execution.userMessage) : execution.userMessage,
        assistantMessage:
            execution.assistantMessage && typeof execution.assistantMessage === 'string'
                ? JSON.parse(execution.assistantMessage)
                : execution.assistantMessage,
        toolCalls:
            execution.toolCalls && typeof execution.toolCalls === 'string'
                ? JSON.parse(execution.toolCalls)
                : execution.toolCalls,
        usage: execution.usage && typeof execution.usage === 'string' ? JSON.parse(execution.usage) : execution.usage,
        error: execution.error && typeof execution.error === 'string' ? JSON.parse(execution.error) : execution.error,
    };
}

/**
 * Gets active streaming executions for a user chat
 *
 * @public exported from Agents Server utils
 */
export async function getActiveStreamingExecutionsForChat(
    userChatId: string,
): Promise<ReadonlyArray<StreamingExecution>> {
    const sql = await $provideClientSql();

    const executions = await sql<StreamingExecution[]>`
        SELECT * FROM "ChatStreamingExecution"
        WHERE "userChatId" = ${userChatId}
        AND "status" IN ('PENDING', 'STREAMING')
        ORDER BY "createdAt" DESC
    `;

    return executions.map((execution: StreamingExecution) => ({
        ...execution,
        userMessage:
            typeof execution.userMessage === 'string' ? JSON.parse(execution.userMessage) : execution.userMessage,
        assistantMessage:
            execution.assistantMessage && typeof execution.assistantMessage === 'string'
                ? JSON.parse(execution.assistantMessage)
                : execution.assistantMessage,
        toolCalls:
            execution.toolCalls && typeof execution.toolCalls === 'string'
                ? JSON.parse(execution.toolCalls)
                : execution.toolCalls,
        usage: execution.usage && typeof execution.usage === 'string' ? JSON.parse(execution.usage) : execution.usage,
        error: execution.error && typeof execution.error === 'string' ? JSON.parse(execution.error) : execution.error,
    }));
}
