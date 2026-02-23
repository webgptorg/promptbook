import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';
import { resolveCanonicalAgentName } from '@/src/utils/resolveCanonicalAgentName';
import { PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/core';
import { computeHash } from '@promptbook-local/utils';

/**
 * Insert payload shape for the `ChatHistory` table.
 */
type ChatHistoryInsert = AgentsServerDatabase['public']['Tables']['ChatHistory']['Insert'];

/**
 * Error shape returned by Supabase PostgREST calls.
 */
type ChatHistoryInsertError = {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
};

/**
 * Source value for chat-history records.
 */
export type ChatHistorySource = NonNullable<ChatHistoryInsert['source']>;

/**
 * Actor type value for chat-history records.
 */
export type ChatHistoryActorType = NonNullable<ChatHistoryInsert['actorType']>;

/**
 * Configuration used to create one request-scoped chat-history recorder.
 */
export type CreateChatHistoryRecorderOptions = {
    /**
     * HTTP request that carries telemetry headers and URL.
     */
    request: Request;
    /**
     * Agent route identifier (`agentName` or `permanentId`).
     */
    agentIdentifier: string;
    /**
     * Hash of the active agent source.
     */
    agentHash: string;
    /**
     * Origin of the chat call.
     */
    source: ChatHistorySource;
    /**
     * Optional API key used for OpenAI-compatible calls.
     */
    apiKey?: string | null;
    /**
     * Optional explicit actor type. When omitted it is inferred from API key and auth cookies.
     */
    actorType?: ChatHistoryActorType;
    /**
     * When false, recorder computes hashes but skips DB writes.
     */
    isEnabled?: boolean;
};

/**
 * One chat message to persist in the `ChatHistory` table.
 */
export type RecordChatHistoryMessageOptions = {
    /**
     * Message payload stored as JSON.
     */
    message: ChatHistoryInsert['message'];
    /**
     * Hash of the previous message in the chat sequence.
     */
    previousMessageHash?: string | null;
    /**
     * Optional usage tracking statistics.
     */
    usage?: ChatHistoryInsert['usage'];
};

/**
 * Function that records one chat message and returns its computed hash.
 */
export type RecordChatHistoryMessage = (options: RecordChatHistoryMessageOptions) => Promise<string>;

/**
 * Optional columns that may be missing on partially migrated databases.
 */
const CHAT_HISTORY_OPTIONAL_COLUMNS = ['source', 'apiKey', 'actorType', 'usage'] as const;

/**
 * Creates one request-scoped recorder for `ChatHistory`.
 */
export async function createChatHistoryRecorder(
    options: CreateChatHistoryRecorderOptions,
): Promise<RecordChatHistoryMessage> {
    const { request, agentIdentifier, agentHash, source, apiKey = null, actorType, isEnabled = true } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('ChatHistory');
    const userAgent = request.headers.get('user-agent');
    const ip = resolveIpAddress(request);
    const language = request.headers.get('accept-language');
    const platform = resolvePlatform(userAgent);
    const resolvedActorType = actorType ?? inferActorType({ request, apiKey });
    const canonicalAgentName = isEnabled ? await resolveCanonicalAgentName(agentIdentifier) : null;
    const agentNameForInsert = canonicalAgentName || agentIdentifier;

    return async ({ message, previousMessageHash = null, usage = null }: RecordChatHistoryMessageOptions): Promise<string> => {
        const messageHash = computeHash(message);
        if (!isEnabled) {
            return messageHash;
        }

        const row: ChatHistoryInsert = {
            createdAt: new Date().toISOString(),
            messageHash,
            previousMessageHash,
            agentName: agentNameForInsert,
            agentHash,
            message,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            url: request.url,
            ip,
            userAgent,
            language,
            platform,
            source,
            apiKey,
            actorType: resolvedActorType,
            usage,
        };

        const { error } = await supabase.from(tableName).insert(row);
        if (!error) {
            return messageHash;
        }

        if (isMissingOptionalColumnError(error)) {
            const rowWithoutOptionalColumns: Omit<ChatHistoryInsert, 'source' | 'apiKey' | 'actorType' | 'usage'> = {
                createdAt: row.createdAt,
                messageHash: row.messageHash,
                previousMessageHash: row.previousMessageHash,
                agentName: row.agentName,
                agentHash: row.agentHash,
                message: row.message,
                promptbookEngineVersion: row.promptbookEngineVersion,
                url: row.url,
                ip: row.ip,
                userAgent: row.userAgent,
                language: row.language,
                platform: row.platform,
            };

            const retryResult = await supabase.from(tableName).insert(rowWithoutOptionalColumns);
            if (!retryResult.error) {
                console.warn('[ChatHistory] Insert succeeded after fallback without optional columns.', {
                    agentIdentifier,
                    canonicalAgentName: agentNameForInsert,
                    missingColumns: CHAT_HISTORY_OPTIONAL_COLUMNS,
                });
                return messageHash;
            }
        }

        console.error('[ChatHistory] Failed to record message.', {
            agentIdentifier,
            canonicalAgentName: agentNameForInsert,
            source,
            actorType: resolvedActorType,
            error,
        });
        return messageHash;
    };
}

/**
 * Resolves client IP from common proxy headers.
 */
function resolveIpAddress(request: Request): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const firstAddress = forwardedFor.split(',')[0]?.trim();
        if (firstAddress) {
            return firstAddress;
        }
    }

    return request.headers.get('x-real-ip') || request.headers.get('x-client-ip');
}

/**
 * Extracts platform segment from user-agent text.
 */
function resolvePlatform(userAgent: string | null): string | null {
    if (!userAgent) {
        return null;
    }

    return userAgent.match(/\(([^)]+)\)/)?.[1] || null;
}

/**
 * Infers actor type from request auth context.
 */
function inferActorType(options: {
    request: Request;
    apiKey: string | null;
}): ChatHistoryActorType {
    const { request, apiKey } = options;
    if (apiKey) {
        return 'API_KEY';
    }

    const cookieHeader = request.headers.get('cookie') || '';
    if (/(^|;\s*)(sessionToken|adminToken)=/.test(cookieHeader)) {
        return 'TEAM_MEMBER';
    }

    return 'ANONYMOUS';
}

/**
 * Detects "missing optional column" insert errors from PostgREST.
 */
function isMissingOptionalColumnError(error: ChatHistoryInsertError): boolean {
    const code = error.code || '';
    if (code !== '42703' && code !== 'PGRST204') {
        return false;
    }

    const errorText = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
    return CHAT_HISTORY_OPTIONAL_COLUMNS.some((columnName) => errorText.includes(columnName.toLowerCase()));
}
