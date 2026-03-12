import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { CancelTimeoutToolArgs, SetTimeoutToolArgs } from './TimeoutToolRuntimeAdapter';

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
};
