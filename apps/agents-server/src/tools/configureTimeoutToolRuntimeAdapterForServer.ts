import {
    setTimeoutToolRuntimeAdapter,
    type TimeoutToolRuntimeContext,
} from '../../../../src/commitments/USE_TIMEOUT/USE_TIMEOUT';
import {
    cancelScheduledUserChatTimeout,
    scheduleThreadScopedUserChatTimeout,
} from '../utils/userChatTimeout/userChatTimeoutWorker';
import { getUserChatTimeout } from '../utils/userChatTimeout/userChatTimeoutStore';

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
        const chatId = requireThreadScopedTimeoutField(runtimeContext.chatId, 'chat');
        const userId = requireThreadScopedTimeoutField(runtimeContext.userId, 'user');
        const agentPermanentId = requireThreadScopedTimeoutField(runtimeContext.agentId, 'agent');
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
        const chatId = requireThreadScopedTimeoutField(runtimeContext.chatId, 'chat');
        const userId = requireThreadScopedTimeoutField(runtimeContext.userId, 'user');
        const agentPermanentId = requireThreadScopedTimeoutField(runtimeContext.agentId, 'agent');
        const existingTimeout = await getUserChatTimeout({
            userId,
            agentPermanentId,
            chatId,
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
 * Ensures one required thread-scoped timeout field is available in runtime context.
 *
 * @private internal utility for timeout tool adapters
 */
function requireThreadScopedTimeoutField<TValue>(
    value: TValue | undefined,
    fieldName: 'chat' | 'user' | 'agent',
): TValue {
    if (value === undefined || value === null) {
        throw new Error(`Timeouts are unavailable because ${fieldName} thread context is missing.`);
    }

    if (typeof value === 'string' && value.length === 0) {
        throw new Error(`Timeouts are unavailable because ${fieldName} thread context is missing.`);
    }

    return value;
}
