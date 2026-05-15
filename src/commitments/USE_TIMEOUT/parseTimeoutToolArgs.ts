import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type {
    CancelTimeoutToolArgs,
    ListTimeoutsToolArgs,
    SetTimeoutToolArgs,
    UpdateTimeoutToolArgs,
} from './TimeoutToolRuntimeAdapter';

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
 * Parsed timeout target selector shared by timeout tools that can act on either one timeout or all active ones.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
type ParsedTimeoutTargetSelection =
    | {
          timeoutId: string;
          allActive: false;
      }
    | {
          allActive: true;
      };

/**
 * Creates one formatted timeout-argument validation error.
 *
 * @private internal utility of USE TIMEOUT
 */
function createTimeoutToolArgsError(message: string): PipelineExecutionError {
    return new PipelineExecutionError(
        spaceTrim(`
            ${message}
        `),
    );
}

/**
 * Normalizes one optional timeout id string.
 *
 * @private internal utility of USE TIMEOUT
 */
function normalizeOptionalTimeoutId(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * Parses timeout target selection for tools that accept either `timeoutId` or `allActive: true`.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseTimeoutTargetSelection(
    args: { timeoutId?: string; allActive?: boolean },
    options: {
        bothMessage: string;
        missingMessage: string;
    },
): ParsedTimeoutTargetSelection {
    const timeoutId = normalizeOptionalTimeoutId(args.timeoutId);
    const allActive = args.allActive === true;

    if (timeoutId && allActive) {
        throw createTimeoutToolArgsError(options.bothMessage);
    }

    if (allActive) {
        return { allActive: true };
    }

    if (!timeoutId) {
        throw createTimeoutToolArgsError(options.missingMessage);
    }

    return {
        timeoutId,
        allActive: false,
    };
}

/**
 * Parses one explicit `dueAt` update value.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseOptionalTimeoutDueAt(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return undefined;
    }

    const normalizedDueAt = value.trim();
    const dueAtTimestamp = Date.parse(normalizedDueAt);

    if (!Number.isFinite(dueAtTimestamp)) {
        throw createTimeoutToolArgsError('Timeout `dueAt` must be one valid ISO timestamp.');
    }

    return new Date(dueAtTimestamp).toISOString();
}

/**
 * Parses one explicit `extendByMs` update value.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseOptionalTimeoutExtendByMs(value: unknown): number | undefined {
    if (typeof value !== 'number') {
        return undefined;
    }

    if (!Number.isFinite(value) || value <= 0) {
        throw createTimeoutToolArgsError('Timeout `extendByMs` must be a positive number of milliseconds.');
    }

    return Math.floor(value);
}

/**
 * Parses one explicit `recurrenceIntervalMs` update value.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseOptionalTimeoutRecurrenceInterval(value: unknown): number | null | undefined {
    if (value === null) {
        return null;
    }

    if (typeof value !== 'number') {
        return undefined;
    }

    if (!Number.isFinite(value) || value <= 0) {
        throw createTimeoutToolArgsError(
            'Timeout `recurrenceIntervalMs` must be a positive number of milliseconds or `null`.',
        );
    }

    return Math.floor(value);
}

/**
 * Parses one explicit `message` update value.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseOptionalTimeoutMessage(value: unknown): string | null | undefined {
    if (value === null) {
        return null;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedMessage = value.trim();
    return normalizedMessage.length > 0 ? normalizedMessage : null;
}

/**
 * Parses one explicit `parameters` update value.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseOptionalTimeoutParameters(value: unknown): Record<string, unknown> | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw createTimeoutToolArgsError('Timeout `parameters` must be one JSON object.');
    }

    return value as Record<string, unknown>;
}

/**
 * Parses one explicit `paused` update value.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseOptionalTimeoutPaused(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

/**
 * Parses patch fields for `update_timeout`.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseTimeoutUpdatePatch(args: UpdateTimeoutToolArgs): ParsedUpdateTimeoutToolPatch {
    const patch: ParsedUpdateTimeoutToolPatch = {};
    const dueAt = parseOptionalTimeoutDueAt(args.dueAt);
    const extendByMs = parseOptionalTimeoutExtendByMs(args.extendByMs);
    const recurrenceIntervalMs = parseOptionalTimeoutRecurrenceInterval(args.recurrenceIntervalMs);
    const message = parseOptionalTimeoutMessage(args.message);
    const parameters = parseOptionalTimeoutParameters(args.parameters);
    const paused = parseOptionalTimeoutPaused(args.paused);

    if (dueAt !== undefined) {
        patch.dueAt = dueAt;
    }

    if (extendByMs !== undefined) {
        patch.extendByMs = extendByMs;
    }

    if (patch.dueAt !== undefined && patch.extendByMs !== undefined) {
        throw createTimeoutToolArgsError('Timeout update cannot include both `dueAt` and `extendByMs`.');
    }

    if (recurrenceIntervalMs !== undefined) {
        patch.recurrenceIntervalMs = recurrenceIntervalMs;
    }

    if (message !== undefined) {
        patch.message = message;
    }

    if (parameters !== undefined) {
        patch.parameters = parameters;
    }

    if (paused !== undefined) {
        patch.paused = paused;
    }

    return patch;
}

/**
 * Determines whether the patch contains fields that are only supported for single-timeout updates.
 *
 * @private internal utility of USE TIMEOUT
 */
function hasSingleTimeoutOnlyPatchFields(patch: ParsedUpdateTimeoutToolPatch): boolean {
    return (
        patch.dueAt !== undefined ||
        patch.extendByMs !== undefined ||
        patch.recurrenceIntervalMs !== undefined ||
        patch.message !== undefined ||
        patch.parameters !== undefined
    );
}

/**
 * Parses bulk timeout update arguments.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseBulkTimeoutUpdateArgs(patch: ParsedUpdateTimeoutToolPatch): Extract<ParsedUpdateTimeoutToolArgs, { allActive: true }> {
    if (patch.paused === undefined) {
        throw createTimeoutToolArgsError('Bulk timeout update with `allActive: true` requires `paused` to be explicitly set.');
    }

    if (hasSingleTimeoutOnlyPatchFields(patch)) {
        throw createTimeoutToolArgsError('Bulk timeout update only supports the `paused` field.');
    }

    return {
        allActive: true,
        paused: patch.paused,
    };
}

/**
 * Parses single-timeout update arguments.
 *
 * @private internal utility of USE TIMEOUT
 */
function parseSingleTimeoutUpdateArgs(
    timeoutId: string,
    patch: ParsedUpdateTimeoutToolPatch,
): Extract<ParsedUpdateTimeoutToolArgs, { timeoutId: string }> {
    if (!timeoutId) {
        throw createTimeoutToolArgsError('Timeout `timeoutId` is required for single-timeout updates.');
    }

    if (Object.keys(patch).length === 0) {
        throw createTimeoutToolArgsError('Timeout update must include at least one editable field.');
    }

    return {
        timeoutId,
        patch,
    };
}

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
        const target = parseTimeoutTargetSelection(args, {
            bothMessage: 'Timeout cancellation must target either one `timeoutId` or `allActive: true`, not both.',
            missingMessage: 'Timeout `timeoutId` is required unless you pass `allActive: true`.',
        });

        if (target.allActive) {
            return { allActive: true };
        }

        return { timeoutId: target.timeoutId };
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
        const target = parseTimeoutTargetSelection(args, {
            bothMessage: 'Timeout update must target either one `timeoutId` or `allActive: true`, not both.',
            missingMessage: 'Timeout update requires one `timeoutId` or `allActive: true`.',
        });
        const patch = parseTimeoutUpdatePatch(args);

        return target.allActive ? parseBulkTimeoutUpdateArgs(patch) : parseSingleTimeoutUpdateArgs(target.timeoutId, patch);
    },
};
