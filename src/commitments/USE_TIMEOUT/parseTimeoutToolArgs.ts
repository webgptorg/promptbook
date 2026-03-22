import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { CancelTimeoutToolArgs, ListTimeoutsToolArgs, SetTimeoutToolArgs } from './TimeoutToolRuntimeAdapter';

/**
 * Default number of rows returned by `list_timeouts`.
 *
 * @private internal USE TIMEOUT constant
 */
const DEFAULT_LIST_TIMEOUTS_LIMIT = 20;

/**
 * Hard cap for `list_timeouts` page size.
 *
 * @private internal USE TIMEOUT constant
 */
const MAX_LIST_TIMEOUTS_LIMIT = 100;

/**
 * Parsed arguments for `set_timeout`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
type ParsedSetTimeoutToolArgs = {
    milliseconds: number;
    message?: string;
};

/**
 * Parsed arguments for `cancel_timeout`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
type ParsedCancelTimeoutToolArgs = {
    timeoutId: string;
};

/**
 * Parsed arguments for `list_timeouts`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
type ParsedListTimeoutsToolArgs = {
    includeFinished: boolean;
    limit: number;
};

/**
 * Parses and validates `USE TIMEOUT` tool arguments.
 *
 * @private internal utility of USE TIMEOUT
 */
export const parseTimeoutToolArgs = {
    /**
     * Parses `set_timeout` input.
     */
    set(args: SetTimeoutToolArgs): ParsedSetTimeoutToolArgs {
        const parsedMilliseconds = Number(args.milliseconds);

        if (!Number.isFinite(parsedMilliseconds) || parsedMilliseconds <= 0) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout \`milliseconds\` must be a positive number.
                `),
            );
        }

        const message = typeof args.message === 'string' ? args.message.trim() : '';

        return {
            milliseconds: Math.floor(parsedMilliseconds),
            ...(message ? { message } : {}),
        };
    },

    /**
     * Parses `cancel_timeout` input.
     */
    cancel(args: CancelTimeoutToolArgs): ParsedCancelTimeoutToolArgs {
        const timeoutId = typeof args.timeoutId === 'string' ? args.timeoutId.trim() : '';

        if (!timeoutId) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout \`timeoutId\` is required.
                `),
            );
        }

        return { timeoutId };
    },

    /**
     * Parses `list_timeouts` input.
     */
    list(args: ListTimeoutsToolArgs): ParsedListTimeoutsToolArgs {
        if (args.includeFinished !== undefined && typeof args.includeFinished !== 'boolean') {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout \`includeFinished\` must be a boolean when provided.
                `),
            );
        }

        const parsedLimit =
            args.limit === undefined ? DEFAULT_LIST_TIMEOUTS_LIMIT : Math.floor(Number(args.limit));

        if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout \`limit\` must be a positive number.
                `),
            );
        }

        if (parsedLimit > MAX_LIST_TIMEOUTS_LIMIT) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout \`limit\` must be at most \`${MAX_LIST_TIMEOUTS_LIMIT}\`.
                `),
            );
        }

        return {
            includeFinished: args.includeFinished === true,
            limit: parsedLimit,
        };
    },
};
