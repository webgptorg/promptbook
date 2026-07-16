import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * Tool arguments for scheduling one timeout.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type SetTimeoutToolArgs = {
    milliseconds?: number;
    message?: string;
    [key: string]: TODO_any;
};

/**
 * Tool arguments for cancelling one timeout.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type CancelTimeoutToolArgs = {
    timeoutId?: string;
    allActive?: boolean;
    [key: string]: TODO_any;
};

/**
 * Tool arguments for updating one timeout or pausing/resuming all active queued timeouts.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type UpdateTimeoutToolArgs = {
    timeoutId?: string;
    allActive?: boolean;
    dueAt?: string;
    extendByMs?: number;
    recurrenceIntervalMs?: number | null;
    message?: string | null;
    parameters?: Record<string, unknown>;
    paused?: boolean;
    [key: string]: TODO_any;
};

/**
 * Tool arguments for listing scoped timeouts.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type ListTimeoutsToolArgs = {
    includeFinished?: boolean;
    limit?: number;
    [key: string]: TODO_any;
};

/**
 * Runtime context available to `USE TIMEOUT` tools.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type TimeoutToolRuntimeContext = {
    readonly enabled: boolean;
    readonly chatId?: string;
    readonly userId?: number;
    readonly agentId?: string;
    readonly agentName?: string;
    readonly promptParameters: Record<string, string>;
};

/**
 * Lifecycle status exposed by `list_timeouts`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type TimeoutToolListItemStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * One timeout row exposed by `list_timeouts`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type TimeoutToolListItem = {
    timeoutId: string;
    chatId: string;
    status: TimeoutToolListItemStatus;
    dueAt: string;
    paused: boolean;
    message?: string | null;
    recurrenceIntervalMs?: number | null;
};

/**
 * Result payload returned by `set_timeout`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type SetTimeoutToolResult = {
    action: 'set';
    status: 'set' | 'disabled' | 'error';
    timeoutId?: string;
    dueAt?: string;
    message?: string;
};

/**
 * Result payload returned by `cancel_timeout`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type CancelTimeoutToolResult = {
    action: 'cancel';
    status: 'cancelled' | 'cancelled_all' | 'not_found' | 'disabled' | 'error';
    timeoutId?: string;
    dueAt?: string;
    cancelledCount?: number;
    cancelledTimeoutIds?: Array<string>;
    hasMore?: boolean;
    message?: string;
};

/**
 * Result payload returned by `update_timeout`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type UpdateTimeoutToolResult = {
    action: 'update';
    status: 'updated' | 'updated_all' | 'not_found' | 'conflict' | 'disabled' | 'error';
    timeoutId?: string;
    dueAt?: string;
    paused?: boolean;
    recurrenceIntervalMs?: number | null;
    updatedCount?: number;
    matchedCount?: number;
    updatedTimeoutIds?: Array<string>;
    hasMore?: boolean;
    message?: string;
};

/**
 * Result payload returned by `list_timeouts`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type ListTimeoutsToolResult = {
    action: 'list';
    status: 'listed' | 'disabled' | 'error';
    items?: Array<TimeoutToolListItem>;
    total?: number;
    message?: string;
};

/**
 * Union of all `USE TIMEOUT` tool actions.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type TimeoutToolAction =
    | SetTimeoutToolResult['action']
    | CancelTimeoutToolResult['action']
    | ListTimeoutsToolResult['action']
    | UpdateTimeoutToolResult['action'];

/**
 * Union of all `USE TIMEOUT` tool results.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type TimeoutToolResult =
    | SetTimeoutToolResult
    | CancelTimeoutToolResult
    | ListTimeoutsToolResult
    | UpdateTimeoutToolResult;

/**
 * Runtime adapter used by `USE TIMEOUT` tools.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type TimeoutToolRuntimeAdapter = {
    scheduleTimeout(
        args: {
            milliseconds: number;
            message?: string;
        },
        runtimeContext: TimeoutToolRuntimeContext,
    ): Promise<{
        timeoutId: string;
        dueAt: string;
    }>;
    cancelTimeout(
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
    }>;
    listTimeouts(
        args: {
            includeFinished: boolean;
            limit: number;
        },
        runtimeContext: TimeoutToolRuntimeContext,
    ): Promise<{
        items: Array<TimeoutToolListItem>;
        total: number;
    }>;
    updateTimeout(
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
    >;
};
