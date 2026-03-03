import { $provideClientSql } from '@/src/database/$provideClientSql';
import { $provideServer } from '@/src/tools/$provideServer';
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
 * Returns properly quoted SQL identifier.
 *
 * @private internal utility of Agents Server chat streaming
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Resolves fully qualified table identifier for streaming execution records.
 *
 * @private internal utility of Agents Server chat streaming
 */
async function getStreamingExecutionTableIdentifier(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return quoteIdentifier(`${tablePrefix}ChatStreamingExecution`);
}

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
    const tableIdentifier = await getStreamingExecutionTableIdentifier();

    const [execution] = await sql.raw<StreamingExecution[]>(
        `
        INSERT INTO ${tableIdentifier} (
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
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
        )
        RETURNING *
    `,
        [
            executionId,
            now,
            now,
            'PENDING',
            userId,
            userChatId,
            agentPermanentId,
            agentName,
            agentHash,
            JSON.stringify(userMessage),
            userMessageHash,
        ],
    );

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
    const tableIdentifier = await getStreamingExecutionTableIdentifier();

    if (toolCalls) {
        await sql.raw(
            `
            UPDATE ${tableIdentifier}
            SET
                "assistantMessageDelta" = "assistantMessageDelta" || $1,
                "toolCalls" = $2,
                "updatedAt" = $3,
                "status" = CASE WHEN "status" = 'PENDING' THEN 'STREAMING' ELSE "status" END
            WHERE "id" = $4
        `,
            [delta, JSON.stringify(toolCalls), now, executionId],
        );
    } else {
        await sql.raw(
            `
            UPDATE ${tableIdentifier}
            SET
                "assistantMessageDelta" = "assistantMessageDelta" || $1,
                "updatedAt" = $2,
                "status" = CASE WHEN "status" = 'PENDING' THEN 'STREAMING' ELSE "status" END
            WHERE "id" = $3
        `,
            [delta, now, executionId],
        );
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
    const tableIdentifier = await getStreamingExecutionTableIdentifier();

    await sql.raw(
        `
        UPDATE ${tableIdentifier}
        SET
            "assistantMessage" = $1,
            "assistantMessageHash" = $2,
            "usage" = $3,
            "toolCalls" = $4,
            "status" = $5,
            "completedAt" = $6,
            "updatedAt" = $7
        WHERE "id" = $8
    `,
        [
            JSON.stringify(assistantMessage),
            assistantMessageHash,
            usage ? JSON.stringify(usage) : null,
            toolCalls ? JSON.stringify(toolCalls) : null,
            'COMPLETED',
            now,
            now,
            executionId,
        ],
    );
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
    const tableIdentifier = await getStreamingExecutionTableIdentifier();

    const errorData = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;

    await sql.raw(
        `
        UPDATE ${tableIdentifier}
        SET
            "error" = $1,
            "status" = $2,
            "completedAt" = $3,
            "updatedAt" = $4
        WHERE "id" = $5
    `,
        [JSON.stringify(errorData), 'FAILED', now, now, executionId],
    );
}

/**
 * Marks a streaming execution as cancelled
 *
 * @public exported from Agents Server utils
 */
export async function cancelStreamingExecution(executionId: string): Promise<void> {
    const sql = await $provideClientSql();
    const now = $getCurrentDate();
    const tableIdentifier = await getStreamingExecutionTableIdentifier();

    await sql.raw(
        `
        UPDATE ${tableIdentifier}
        SET
            "status" = $1,
            "completedAt" = $2,
            "updatedAt" = $3
        WHERE "id" = $4
        AND "status" IN ('PENDING', 'STREAMING')
    `,
        ['CANCELLED', now, now, executionId],
    );
}

/**
 * Gets a streaming execution by ID
 *
 * @public exported from Agents Server utils
 */
export async function getStreamingExecution(executionId: string): Promise<StreamingExecution | null> {
    const sql = await $provideClientSql();
    const tableIdentifier = await getStreamingExecutionTableIdentifier();

    const [execution] = await sql.raw<StreamingExecution[]>(`SELECT * FROM ${tableIdentifier} WHERE "id" = $1`, [
        executionId,
    ]);

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
    const tableIdentifier = await getStreamingExecutionTableIdentifier();

    const executions = await sql.raw<StreamingExecution[]>(
        `SELECT * FROM ${tableIdentifier} WHERE "userChatId" = $1 AND "status" IN ('PENDING', 'STREAMING') ORDER BY "createdAt" DESC`,
        [userChatId],
    );

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
