import type { TODO_any } from '../../_packages/types.index';

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
    status: 'cancelled' | 'not_found' | 'disabled' | 'error';
    timeoutId?: string;
    dueAt?: string;
    message?: string;
};

/**
 * Union of all `USE TIMEOUT` tool actions.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type TimeoutToolAction = SetTimeoutToolResult['action'] | CancelTimeoutToolResult['action'];

/**
 * Union of all `USE TIMEOUT` tool results.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
export type TimeoutToolResult = SetTimeoutToolResult | CancelTimeoutToolResult;

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
        args: {
            timeoutId: string;
        },
        runtimeContext: TimeoutToolRuntimeContext,
    ): Promise<{
        timeoutId: string;
        dueAt?: string;
        status: 'cancelled' | 'not_found';
    }>;
};
