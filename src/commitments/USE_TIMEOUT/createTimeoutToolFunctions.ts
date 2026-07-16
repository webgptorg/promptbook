import { spaceTrim } from 'spacetrim';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { string_javascript_name } from '../../types/string_person_fullname';
import { createToolExecutionEnvelope } from '../_common/toolExecutionEnvelope';
import { getTimeoutToolRuntimeAdapterOrDisabledResult } from './getTimeoutToolRuntimeAdapterOrDisabledResult';
import { parseTimeoutToolArgs } from './parseTimeoutToolArgs';
import { resolveTimeoutRuntimeContext } from './resolveTimeoutRuntimeContext';
import { TimeoutToolNames } from './TimeoutToolNames';
import type {
    CancelTimeoutToolArgs,
    CancelTimeoutToolResult,
    ListTimeoutsToolArgs,
    ListTimeoutsToolResult,
    SetTimeoutToolArgs,
    SetTimeoutToolResult,
    TimeoutToolListItem,
    UpdateTimeoutToolArgs,
    UpdateTimeoutToolResult,
} from './TimeoutToolRuntimeAdapter';

/**
 * Maximum number of timeout rows rendered into the assistant-visible `list_timeouts` message.
 *
 * @private internal USE TIMEOUT constant
 */
const MAX_ASSISTANT_VISIBLE_TIMEOUT_ROWS = 20;

/**
 * Maximum number of timeout ids rendered in bulk-action summaries.
 *
 * @private internal USE TIMEOUT constant
 */
const MAX_ASSISTANT_VISIBLE_BULK_TIMEOUT_IDS = 10;

/**
 * Gets `USE TIMEOUT` tool function implementations.
 *
 * @private internal utility of USE TIMEOUT
 */
export function createTimeoutToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [TimeoutToolNames.set](args: SetTimeoutToolArgs): Promise<string> {
            const runtimeContext = resolveTimeoutRuntimeContext(args);
            const { adapter, disabledResult } = getTimeoutToolRuntimeAdapterOrDisabledResult('set', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseTimeoutToolArgs.set(args);
                const scheduledTimeout = await adapter.scheduleTimeout(parsedArgs, runtimeContext);
                const result: SetTimeoutToolResult = {
                    action: 'set',
                    status: 'set',
                    timeoutId: scheduledTimeout.timeoutId,
                    dueAt: scheduledTimeout.dueAt,
                };

                return createToolExecutionEnvelope({
                    assistantMessage: 'The timer was set.',
                    toolResult: result,
                });
            } catch (error) {
                const result: SetTimeoutToolResult = {
                    action: 'set',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };

                return JSON.stringify(result);
            }
        },
        async [TimeoutToolNames.cancel](args: CancelTimeoutToolArgs): Promise<string> {
            const runtimeContext = resolveTimeoutRuntimeContext(args);
            const { adapter, disabledResult } = getTimeoutToolRuntimeAdapterOrDisabledResult('cancel', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseTimeoutToolArgs.cancel(args);
                const cancelledTimeout = await adapter.cancelTimeout(parsedArgs, runtimeContext);

                if (cancelledTimeout.status === 'cancelled_all') {
                    const result: CancelTimeoutToolResult = {
                        action: 'cancel',
                        status: 'cancelled_all',
                        cancelledCount: cancelledTimeout.cancelledCount || 0,
                        cancelledTimeoutIds: cancelledTimeout.cancelledTimeoutIds || [],
                        hasMore: cancelledTimeout.hasMore,
                    };

                    return createToolExecutionEnvelope({
                        assistantMessage: createBulkCancelAssistantMessage({
                            cancelledCount: result.cancelledCount || 0,
                            cancelledTimeoutIds: result.cancelledTimeoutIds || [],
                            hasMore: result.hasMore,
                        }),
                        toolResult: result,
                    });
                }

                const result: CancelTimeoutToolResult = {
                    action: 'cancel',
                    status: cancelledTimeout.status,
                    timeoutId: cancelledTimeout.timeoutId,
                    dueAt: cancelledTimeout.dueAt,
                };

                return createToolExecutionEnvelope({
                    assistantMessage:
                        cancelledTimeout.status === 'cancelled'
                            ? 'The timer was cancelled.'
                            : 'The timer was already inactive.',
                    toolResult: result,
                });
            } catch (error) {
                const result: CancelTimeoutToolResult = {
                    action: 'cancel',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };

                return JSON.stringify(result);
            }
        },
        async [TimeoutToolNames.list](args: ListTimeoutsToolArgs): Promise<string> {
            const runtimeContext = resolveTimeoutRuntimeContext(args);
            const { adapter, disabledResult } = getTimeoutToolRuntimeAdapterOrDisabledResult('list', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseTimeoutToolArgs.list(args);
                const listedTimeouts = await adapter.listTimeouts(parsedArgs, runtimeContext);
                const result: ListTimeoutsToolResult = {
                    action: 'list',
                    status: 'listed',
                    items: listedTimeouts.items,
                    total: listedTimeouts.total,
                };

                return createToolExecutionEnvelope({
                    assistantMessage: createListedTimeoutsAssistantMessage({
                        total: listedTimeouts.total,
                        items: listedTimeouts.items,
                    }),
                    toolResult: result,
                });
            } catch (error) {
                const result: ListTimeoutsToolResult = {
                    action: 'list',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };

                return JSON.stringify(result);
            }
        },
        async [TimeoutToolNames.update](args: UpdateTimeoutToolArgs): Promise<string> {
            const runtimeContext = resolveTimeoutRuntimeContext(args);
            const { adapter, disabledResult } = getTimeoutToolRuntimeAdapterOrDisabledResult('update', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseTimeoutToolArgs.update(args);
                const updatedTimeout = await adapter.updateTimeout(parsedArgs, runtimeContext);

                if (updatedTimeout.status === 'updated_all') {
                    const result: UpdateTimeoutToolResult = {
                        action: 'update',
                        status: 'updated_all',
                        updatedCount: updatedTimeout.updatedCount,
                        matchedCount: updatedTimeout.matchedCount,
                        updatedTimeoutIds: updatedTimeout.updatedTimeoutIds,
                        hasMore: updatedTimeout.hasMore,
                    };

                    return createToolExecutionEnvelope({
                        assistantMessage: createBulkUpdateAssistantMessage({
                            paused: 'allActive' in parsedArgs && parsedArgs.allActive ? parsedArgs.paused : false,
                            updatedCount: updatedTimeout.updatedCount,
                            matchedCount: updatedTimeout.matchedCount,
                            updatedTimeoutIds: updatedTimeout.updatedTimeoutIds,
                            hasMore: updatedTimeout.hasMore,
                        }),
                        toolResult: result,
                    });
                }

                if (updatedTimeout.status === 'not_found') {
                    const result: UpdateTimeoutToolResult = {
                        action: 'update',
                        status: 'not_found',
                        timeoutId: updatedTimeout.timeoutId,
                    };

                    return createToolExecutionEnvelope({
                        assistantMessage: 'The timeout was not found.',
                        toolResult: result,
                    });
                }

                if (updatedTimeout.status === 'conflict') {
                    const conflictMessage =
                        updatedTimeout.reason === 'running'
                            ? 'Running timeout cannot be edited.'
                            : 'Finished timeout cannot be edited.';
                    const result: UpdateTimeoutToolResult = {
                        action: 'update',
                        status: 'conflict',
                        timeoutId: updatedTimeout.timeoutId,
                        message: conflictMessage,
                    };

                    return createToolExecutionEnvelope({
                        assistantMessage: conflictMessage,
                        toolResult: result,
                    });
                }

                const result: UpdateTimeoutToolResult = {
                    action: 'update',
                    status: 'updated',
                    timeoutId: updatedTimeout.timeout.timeoutId,
                    dueAt: updatedTimeout.timeout.dueAt,
                    paused: updatedTimeout.timeout.paused,
                    recurrenceIntervalMs: updatedTimeout.timeout.recurrenceIntervalMs,
                };

                return createToolExecutionEnvelope({
                    assistantMessage: `Updated timeout ${JSON.stringify(updatedTimeout.timeout.timeoutId)}.`,
                    toolResult: result,
                });
            } catch (error) {
                const result: UpdateTimeoutToolResult = {
                    action: 'update',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };

                return JSON.stringify(result);
            }
        },
    };
}

/**
 * Creates assistant-visible summary for one `list_timeouts` response.
 *
 * @private internal utility of USE TIMEOUT
 */
function createListedTimeoutsAssistantMessage(options: { total: number; items: Array<TimeoutToolListItem> }): string {
    if (options.total <= 0 || options.items.length === 0) {
        return 'Found 0 timeouts.';
    }

    const visibleItems = options.items.slice(0, MAX_ASSISTANT_VISIBLE_TIMEOUT_ROWS);
    const summaryRows = visibleItems.map((item, index) => `${index + 1}. ${formatTimeoutListRow(item)}`);
    const hiddenCount = Math.max(0, options.total - visibleItems.length);

    if (hiddenCount > 0) {
        summaryRows.push(`...and ${hiddenCount} more.`);
    }

    return spaceTrim(
        (block) => `
            Found ${options.total} ${options.total === 1 ? 'timeout' : 'timeouts'}:
            ${block(summaryRows.join('\n'))}
        `,
    );
}

/**
 * Formats one timeout row for assistant-visible timeout listings.
 *
 * @private internal utility of USE TIMEOUT
 */
function formatTimeoutListRow(item: TimeoutToolListItem): string {
    const normalizedMessage = typeof item.message === 'string' ? item.message.trim() : '';
    const messageSuffix = normalizedMessage ? ` | message ${JSON.stringify(normalizedMessage)}` : '';
    const recurrenceSuffix =
        typeof item.recurrenceIntervalMs === 'number' && item.recurrenceIntervalMs > 0
            ? ` | recurrence ${item.recurrenceIntervalMs}ms`
            : '';
    const pausedSuffix = item.paused ? ' (paused)' : '';

    return `${item.timeoutId} | ${item.status}${pausedSuffix} | chat ${item.chatId} | due ${item.dueAt}${recurrenceSuffix}${messageSuffix}`;
}

/**
 * Creates assistant-visible summary for bulk timeout cancellation.
 *
 * @private internal utility of USE TIMEOUT
 */
function createBulkCancelAssistantMessage(options: {
    cancelledCount: number;
    cancelledTimeoutIds: Array<string>;
    hasMore?: boolean;
}): string {
    if (options.cancelledCount <= 0) {
        return 'No active timeouts were found to cancel.';
    }

    const visibleTimeoutIds = options.cancelledTimeoutIds.slice(0, MAX_ASSISTANT_VISIBLE_BULK_TIMEOUT_IDS);
    const hiddenIdsCount = Math.max(0, options.cancelledTimeoutIds.length - visibleTimeoutIds.length);
    const hasMoreSuffix = options.hasMore ? ' Additional active timeouts may still exist.' : '';
    const idsSuffix =
        visibleTimeoutIds.length > 0
            ? ` Cancelled ids: ${visibleTimeoutIds.join(', ')}${
                  hiddenIdsCount > 0 ? `, and ${hiddenIdsCount} more.` : '.'
              }`
            : '';

    return `Cancelled ${options.cancelledCount} active ${
        options.cancelledCount === 1 ? 'timeout' : 'timeouts'
    }.${idsSuffix}${hasMoreSuffix}`;
}

/**
 * Creates assistant-visible summary for bulk timeout pause/resume updates.
 *
 * @private internal utility of USE TIMEOUT
 */
function createBulkUpdateAssistantMessage(options: {
    paused: boolean;
    updatedCount: number;
    matchedCount: number;
    updatedTimeoutIds: Array<string>;
    hasMore?: boolean;
}): string {
    if (options.matchedCount <= 0) {
        return options.paused
            ? 'No active queued timeouts were found to pause.'
            : 'No paused queued timeouts were found to resume.';
    }

    const verb = options.paused ? 'Paused' : 'Resumed';
    const visibleTimeoutIds = options.updatedTimeoutIds.slice(0, MAX_ASSISTANT_VISIBLE_BULK_TIMEOUT_IDS);
    const hiddenIdsCount = Math.max(0, options.updatedTimeoutIds.length - visibleTimeoutIds.length);
    const skippedCount = Math.max(0, options.matchedCount - options.updatedCount);
    const idsSuffix =
        visibleTimeoutIds.length > 0
            ? ` Updated ids: ${visibleTimeoutIds.join(', ')}${
                  hiddenIdsCount > 0 ? `, and ${hiddenIdsCount} more.` : '.'
              }`
            : '';
    const skippedSuffix = skippedCount > 0 ? ` Skipped ${skippedCount} due to concurrent changes.` : '';
    const hasMoreSuffix = options.hasMore ? ' Additional matching timeouts may still exist.' : '';

    return `${verb} ${options.updatedCount} ${
        options.updatedCount === 1 ? 'timeout' : 'timeouts'
    }.${idsSuffix}${skippedSuffix}${hasMoreSuffix}`;
}
