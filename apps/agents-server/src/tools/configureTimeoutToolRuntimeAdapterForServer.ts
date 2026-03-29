import {
    setTimeoutToolRuntimeAdapter,
    type TimeoutToolListItem,
    type TimeoutToolRuntimeAdapter,
    type TimeoutToolRuntimeContext,
} from '../../../../src/commitments/USE_TIMEOUT/USE_TIMEOUT';
import {
    cancelAllActiveAgentScopedUserChatTimeouts,
    cancelScheduledUserChatTimeout,
    getAgentScopedUserChatTimeout,
    listAgentUserChatTimeouts,
    notifyUserChatTimeoutScheduleChanged,
    pauseAllActiveAgentScopedUserChatTimeouts,
    resumeAllPausedAgentScopedUserChatTimeouts,
    scheduleThreadScopedUserChatTimeout,
    updateAgentScopedUserChatTimeout,
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
const timeoutToolRuntimeAdapter: TimeoutToolRuntimeAdapter = {
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
        args:
            | {
                  timeoutId: string;
              }
            | {
                  allActive: true;
              },
        runtimeContext: TimeoutToolRuntimeContext,
    ): Promise<{
        status: 'cancelled' | 'cancelled_all' | 'not_found';
        timeoutId?: string;
        dueAt?: string;
        cancelledCount?: number;
        cancelledTimeoutIds?: Array<string>;
        hasMore?: boolean;
    }> {
        const userId = requireTimeoutScopeField(runtimeContext.userId, 'user');
        const agentPermanentId = requireTimeoutScopeField(runtimeContext.agentId, 'agent');

        if ('allActive' in args && args.allActive) {
            const bulkCancellationSummary = await cancelAllActiveAgentScopedUserChatTimeouts({
                userId,
                agentPermanentId,
            });

            return {
                status: 'cancelled_all',
                cancelledCount: bulkCancellationSummary.updatedCount,
                cancelledTimeoutIds: bulkCancellationSummary.timeoutIds,
                hasMore: bulkCancellationSummary.hasMore,
            };
        }

        if (!('timeoutId' in args)) {
            return {
                status: 'not_found',
            };
        }

        const timeoutId = args.timeoutId;

        const existingTimeout = await getAgentScopedUserChatTimeout({
            userId,
            agentPermanentId,
            timeoutId,
        });

        if (!existingTimeout) {
            return {
                timeoutId,
                status: 'not_found',
            };
        }

        const cancelledTimeout = await cancelScheduledUserChatTimeout(timeoutId);

        if (!cancelledTimeout) {
            return {
                timeoutId,
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
            items: listedTimeouts.map(mapTimeoutRecordToToolListItem),
            total: listedTimeouts.length,
        };
    },
    async updateTimeout(
        args:
            | {
                  timeoutId: string;
                  patch: {
                      dueAt?: string;
                      extendByMs?: number;
                      recurrenceIntervalMs?: number | null;
                      message?: string | null;
                      parameters?: Record<string, unknown>;
                      paused?: boolean;
                  };
              }
            | {
                  allActive: true;
                  paused: boolean;
              },
        runtimeContext: TimeoutToolRuntimeContext,
    ): Promise<
        | {
              status: 'updated';
              timeout: TimeoutToolListItem;
          }
        | {
              status: 'not_found';
              timeoutId: string;
          }
        | {
              status: 'conflict';
              timeoutId: string;
              reason: 'finished' | 'running';
          }
        | {
              status: 'updated_all';
              updatedCount: number;
              matchedCount: number;
              updatedTimeoutIds: Array<string>;
              hasMore?: boolean;
          }
    > {
        const userId = requireTimeoutScopeField(runtimeContext.userId, 'user');
        const agentPermanentId = requireTimeoutScopeField(runtimeContext.agentId, 'agent');

        if ('allActive' in args && args.allActive) {
            const bulkSummary = args.paused
                ? await pauseAllActiveAgentScopedUserChatTimeouts({
                      userId,
                      agentPermanentId,
                  })
                : await resumeAllPausedAgentScopedUserChatTimeouts({
                      userId,
                      agentPermanentId,
                  });

            return {
                status: 'updated_all',
                updatedCount: bulkSummary.updatedCount,
                matchedCount: bulkSummary.matchedCount,
                updatedTimeoutIds: bulkSummary.timeoutIds,
                hasMore: bulkSummary.hasMore,
            };
        }

        if (!('timeoutId' in args) || !('patch' in args)) {
            return {
                status: 'not_found',
                timeoutId: '',
            };
        }

        const timeoutId = args.timeoutId;
        const timeoutPatch = args.patch;

        const existingTimeout = await getAgentScopedUserChatTimeout({
            userId,
            agentPermanentId,
            timeoutId,
        });

        if (!existingTimeout) {
            return {
                status: 'not_found',
                timeoutId,
            };
        }

        if (isFinishedTimeoutStatus(existingTimeout.status)) {
            return {
                status: 'conflict',
                timeoutId,
                reason: 'finished',
            };
        }

        if (existingTimeout.status === 'RUNNING') {
            return {
                status: 'conflict',
                timeoutId,
                reason: 'running',
            };
        }

        const updatedTimeout = await updateAgentScopedUserChatTimeout({
            userId,
            agentPermanentId,
            timeoutId,
            patch: {
                ...(timeoutPatch.dueAt !== undefined ? { dueAt: timeoutPatch.dueAt } : {}),
                ...(timeoutPatch.extendByMs !== undefined ? { extendByMs: timeoutPatch.extendByMs } : {}),
                ...(timeoutPatch.recurrenceIntervalMs !== undefined
                    ? { recurrenceIntervalMs: timeoutPatch.recurrenceIntervalMs }
                    : {}),
                ...(timeoutPatch.message !== undefined
                    ? { message: normalizeTimeoutMessage(timeoutPatch.message) || null }
                    : {}),
                ...(timeoutPatch.parameters !== undefined ? { parameters: timeoutPatch.parameters } : {}),
                ...(timeoutPatch.paused !== undefined
                    ? { pausedAt: timeoutPatch.paused ? new Date().toISOString() : null }
                    : {}),
            },
        });

        if (!updatedTimeout) {
            return {
                status: 'not_found',
                timeoutId,
            };
        }

        notifyUserChatTimeoutScheduleChanged(updatedTimeout);

        return {
            status: 'updated',
            timeout: mapTimeoutRecordToToolListItem(updatedTimeout),
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

/**
 * Maps one stored timeout record into one `USE TIMEOUT` list item.
 *
 * @private internal utility for timeout tool adapters
 */
function mapTimeoutRecordToToolListItem(timeout: {
    timeoutId: string;
    chatId: string;
    status: TimeoutToolListItem['status'];
    dueAt: string;
    pausedAt: string | null;
    message: string | null;
    recurrenceIntervalMs: number | null;
}): TimeoutToolListItem {
    return {
        timeoutId: timeout.timeoutId,
        chatId: timeout.chatId,
        status: timeout.status,
        dueAt: timeout.dueAt,
        paused: Boolean(timeout.pausedAt),
        message: timeout.message,
        recurrenceIntervalMs: timeout.recurrenceIntervalMs,
    };
}

/**
 * Returns `true` when one timeout has reached a terminal state.
 *
 * @private internal utility for timeout tool adapters
 */
function isFinishedTimeoutStatus(status: TimeoutToolListItem['status']): boolean {
    return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
}
