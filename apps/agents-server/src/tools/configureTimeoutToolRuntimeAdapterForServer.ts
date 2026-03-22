import {
    setTimeoutToolRuntimeAdapter,
    type TimeoutToolListItem,
    type TimeoutToolRuntimeContext,
} from '../../../../src/commitments/USE_TIMEOUT/USE_TIMEOUT';
import {
    cancelScheduledUserChatTimeout,
    getAgentScopedUserChatTimeout,
    listAgentUserChatTimeouts,
    scheduleThreadScopedUserChatTimeout,
} from '../utils/userChatTimeout';

/**
 * Maximum number of timeouts returned in one `list_timeouts` runtime call.
 *
 * @private internal timeout adapter constant
 */
const MAX_LISTED_TIMEOUTS_LIMIT = 100;

/**
 * Shared timeout runtime adapter bound to the Agents Server durable chat infrastructure.
 *
 * @private internal singleton for server tool providers
 */
const timeoutToolRuntimeAdapter = {
    async scheduleTimeout(
        args: {
            milliseconds: number;
            message?: string;
        },
        runtimeContext: TimeoutToolRuntimeContext,
    ): Promise<{
        timeoutId: string;
        dueAt: string;
    }> {
        const chatId = requireTimeoutScopeField(runtimeContext.chatId, 'chat');
        const userId = requireTimeoutScopeField(runtimeContext.userId, 'user');
        const agentPermanentId = requireTimeoutScopeField(runtimeContext.agentId, 'agent');
        const timeout = await scheduleThreadScopedUserChatTimeout({
            userId,
            agentPermanentId,
            chatId,
            durationMs: args.milliseconds,
            message: normalizeTimeoutMessage(args.message),
            parameters: runtimeContext.promptParameters,
        });

        return {
            timeoutId: timeout.timeoutId,
            dueAt: timeout.dueAt,
        };
    },
    async cancelTimeout(
        args: {
            timeoutId: string;
        },
        runtimeContext: TimeoutToolRuntimeContext,
    ): Promise<{
        timeoutId: string;
        dueAt?: string;
        status: 'cancelled' | 'not_found';
    }> {
        const userId = requireTimeoutScopeField(runtimeContext.userId, 'user');
        const agentPermanentId = requireTimeoutScopeField(runtimeContext.agentId, 'agent');
        const existingTimeout = await getAgentScopedUserChatTimeout({
            userId,
            agentPermanentId,
            timeoutId: args.timeoutId,
        });

        if (!existingTimeout) {
            return {
                timeoutId: args.timeoutId,
                status: 'not_found',
            };
        }

        const cancelledTimeout = await cancelScheduledUserChatTimeout(args.timeoutId);

        if (!cancelledTimeout) {
            return {
                timeoutId: args.timeoutId,
                status: 'not_found',
            };
        }

        return {
            timeoutId: cancelledTimeout.timeoutId,
            dueAt: cancelledTimeout.dueAt,
            status: 'cancelled',
        };
    },
    async listTimeouts(
        args: {
            includeFinished: boolean;
            limit: number;
        },
        runtimeContext: TimeoutToolRuntimeContext,
    ): Promise<{
        items: Array<TimeoutToolListItem>;
        total: number;
    }> {
        const userId = requireTimeoutScopeField(runtimeContext.userId, 'user');
        const agentPermanentId = requireTimeoutScopeField(runtimeContext.agentId, 'agent');
        const limit = normalizeTimeoutListLimit(args.limit);
        const statuses = args.includeFinished ? undefined : (['QUEUED', 'RUNNING'] as const);
        const listedTimeouts = await listAgentUserChatTimeouts({
            userId,
            agentPermanentId,
            limit,
            ...(statuses ? { statuses } : {}),
        });

        return {
            items: listedTimeouts.map((timeout) => ({
                timeoutId: timeout.timeoutId,
                chatId: timeout.chatId,
                status: timeout.status,
                dueAt: timeout.dueAt,
                paused: Boolean(timeout.pausedAt),
                message: timeout.message,
                recurrenceIntervalMs: timeout.recurrenceIntervalMs,
            })),
            total: listedTimeouts.length,
        };
    },
};

/**
 * Installs the Agents Server timeout runtime adapter into the `USE TIMEOUT` commitment layer.
 *
 * @private internal utility for server tool providers
 */
export function configureTimeoutToolRuntimeAdapterForServer(): void {
    setTimeoutToolRuntimeAdapter(timeoutToolRuntimeAdapter);
}

/**
 * Trims optional timeout follow-up message text before persistence.
 *
 * @private internal utility for timeout tool adapters
 */
function normalizeTimeoutMessage(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue || undefined;
}

/**
 * Ensures one required timeout scope field is available in runtime context.
 *
 * @private internal utility for timeout tool adapters
 */
function requireTimeoutScopeField<TValue>(
    value: TValue | undefined,
    fieldName: 'chat' | 'user' | 'agent',
): TValue {
    if (value === undefined || value === null) {
        throw new Error(`Timeouts are unavailable because ${fieldName} scope context is missing.`);
    }

    if (typeof value === 'string' && value.length === 0) {
        throw new Error(`Timeouts are unavailable because ${fieldName} scope context is missing.`);
    }

    return value;
}

/**
 * Clamps requested timeout-list limits to the supported adapter range.
 *
 * @private internal utility for timeout tool adapters
 */
function normalizeTimeoutListLimit(value: number): number {
    if (!Number.isFinite(value)) {
        return MAX_LISTED_TIMEOUTS_LIMIT;
    }

    return Math.max(1, Math.min(MAX_LISTED_TIMEOUTS_LIMIT, Math.floor(value)));
}
