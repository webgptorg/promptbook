import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { CancelTimeoutToolArgs, ListTimeoutsToolArgs, SetTimeoutToolArgs, UpdateTimeoutToolArgs } from './TimeoutToolRuntimeAdapter';

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
type ParsedCancelTimeoutToolArgs =
    | {
          timeoutId: string;
      }
    | {
          allActive: true;
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
 * Parsed patch payload for `update_timeout` single-timeout updates.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
type ParsedUpdateTimeoutToolPatch = {
    dueAt?: string;
    extendByMs?: number;
    recurrenceIntervalMs?: number | null;
    message?: string | null;
    parameters?: Record<string, unknown>;
    paused?: boolean;
};

/**
 * Parsed arguments for `update_timeout`.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
type ParsedUpdateTimeoutToolArgs =
    | {
          timeoutId: string;
          patch: ParsedUpdateTimeoutToolPatch;
      }
    | {
          allActive: true;
          paused: boolean;
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
        const allActive = args.allActive === true;

        if (timeoutId && allActive) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout cancellation must target either one \`timeoutId\` or \`allActive: true\`, not both.
                `),
            );
        }

        if (allActive) {
            return { allActive: true };
        }

        if (!timeoutId) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout \`timeoutId\` is required unless you pass \`allActive: true\`.
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

        const parsedLimit = args.limit === undefined ? DEFAULT_LIST_TIMEOUTS_LIMIT : Math.floor(Number(args.limit));

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

    /**
     * Parses `update_timeout` input.
     */
    update(args: UpdateTimeoutToolArgs): ParsedUpdateTimeoutToolArgs {
        const timeoutId = typeof args.timeoutId === 'string' ? args.timeoutId.trim() : '';
        const allActive = args.allActive === true;

        if (timeoutId && allActive) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout update must target either one \`timeoutId\` or \`allActive: true\`, not both.
                `),
            );
        }

        if (!timeoutId && !allActive) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout update requires one \`timeoutId\` or \`allActive: true\`.
                `),
            );
        }

        const patch: ParsedUpdateTimeoutToolPatch = {};

        if (typeof args.dueAt === 'string' && args.dueAt.trim().length > 0) {
            const normalizedDueAt = args.dueAt.trim();
            const dueAtTimestamp = Date.parse(normalizedDueAt);

            if (!Number.isFinite(dueAtTimestamp)) {
                throw new PipelineExecutionError(
                    spaceTrim(`
                        Timeout \`dueAt\` must be one valid ISO timestamp.
                    `),
                );
            }

            patch.dueAt = new Date(dueAtTimestamp).toISOString();
        }

        if (typeof args.extendByMs === 'number') {
            if (!Number.isFinite(args.extendByMs) || args.extendByMs <= 0) {
                throw new PipelineExecutionError(
                    spaceTrim(`
                        Timeout \`extendByMs\` must be a positive number of milliseconds.
                    `),
                );
            }

            patch.extendByMs = Math.floor(args.extendByMs);
        }

        if (patch.dueAt !== undefined && patch.extendByMs !== undefined) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout update cannot include both \`dueAt\` and \`extendByMs\`.
                `),
            );
        }

        if (args.recurrenceIntervalMs === null) {
            patch.recurrenceIntervalMs = null;
        } else if (typeof args.recurrenceIntervalMs === 'number') {
            if (!Number.isFinite(args.recurrenceIntervalMs) || args.recurrenceIntervalMs <= 0) {
                throw new PipelineExecutionError(
                    spaceTrim(`
                        Timeout \`recurrenceIntervalMs\` must be a positive number of milliseconds or \`null\`.
                    `),
                );
            }

            patch.recurrenceIntervalMs = Math.floor(args.recurrenceIntervalMs);
        }

        if (args.message === null) {
            patch.message = null;
        } else if (typeof args.message === 'string') {
            const normalizedMessage = args.message.trim();
            patch.message = normalizedMessage.length > 0 ? normalizedMessage : null;
        }

        if (args.parameters !== undefined) {
            if (!args.parameters || typeof args.parameters !== 'object' || Array.isArray(args.parameters)) {
                throw new PipelineExecutionError(
                    spaceTrim(`
                        Timeout \`parameters\` must be one JSON object.
                    `),
                );
            }

            patch.parameters = args.parameters as Record<string, unknown>;
        }

        if (typeof args.paused === 'boolean') {
            patch.paused = args.paused;
        }

        if (allActive) {
            if (patch.paused === undefined) {
                throw new PipelineExecutionError(
                    spaceTrim(`
                        Bulk timeout update with \`allActive: true\` requires \`paused\` to be explicitly set.
                    `),
                );
            }

            const hasSingleOnlyPatch =
                patch.dueAt !== undefined ||
                patch.extendByMs !== undefined ||
                patch.recurrenceIntervalMs !== undefined ||
                patch.message !== undefined ||
                patch.parameters !== undefined;

            if (hasSingleOnlyPatch) {
                throw new PipelineExecutionError(
                    spaceTrim(`
                        Bulk timeout update only supports the \`paused\` field.
                    `),
                );
            }

            return {
                allActive: true,
                paused: patch.paused,
            };
        }

        if (!timeoutId) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout \`timeoutId\` is required for single-timeout updates.
                `),
            );
        }

        if (Object.keys(patch).length === 0) {
            throw new PipelineExecutionError(
                spaceTrim(`
                    Timeout update must include at least one editable field.
                `),
            );
        }

        return {
            timeoutId,
            patch,
        };
    },
};
