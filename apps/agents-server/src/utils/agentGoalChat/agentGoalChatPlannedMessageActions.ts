import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';
import type {
    PlannedMessageScheduleInput,
    UpdateAgentScopedUserChatTimeoutPatch,
    UserChatTimeoutRecord,
    UserChatTimeoutStatus,
} from '../userChatTimeout';
import {
    cancelScheduledUserChatTimeout,
    getAgentScopedUserChatTimeout,
    listAgentUserChatTimeouts,
    parsePlannedMessageSchedule,
    resolvePlannedMessageDueAt,
    scheduleThreadScopedUserChatTimeout,
    updateScheduledUserChatTimeout,
} from '../userChatTimeout';
import { ensureAgentGoalChat } from './ensureAgentGoalChat';

/**
 * Default number of rows returned by a planned-message listing.
 */
const DEFAULT_LISTED_PLANNED_MESSAGES_LIMIT = 20;

/**
 * Maximum number of rows returned by one planned-message listing.
 */
const MAX_LISTED_PLANNED_MESSAGES_LIMIT = 100;

/**
 * Timeout states that still represent a future or currently firing goal-chat message.
 */
const ACTIVE_PLANNED_MESSAGE_STATUSES: ReadonlyArray<UserChatTimeoutStatus> = ['QUEUED', 'RUNNING'];

/**
 * Minimal goal-chat identity needed when scheduling a planned message.
 */
type AgentGoalChatPlannedMessageTarget = {
    readonly id: string;
    readonly userId: number;
};

/**
 * Serializable schedule of one planned goal-chat message.
 *
 * The field names match the planned-message sidecar snapshot, so one scheduling result, one listed
 * message, and one sidecar entry all describe a schedule in exactly the same way.
 */
export type AgentGoalChatPlannedMessageScheduleFields = {
    readonly dueAt: string;
    readonly message: string | null;

    /**
     * Repeat interval in milliseconds, or `null` when the planned message does not repeat at a fixed
     * interval.
     */
    readonly intervalMs: number | null;

    /**
     * Five-field cron expression, or `null` when the planned message does not follow a cron.
     */
    readonly cronExpression: string | null;

    /**
     * Moment before which the planned message never wakes the agent, or `null`.
     */
    readonly startsAt: string | null;

    /**
     * Moment after which the planned message never wakes the agent again, or `null`.
     */
    readonly endsAt: string | null;

    /**
     * Total number of wake-ups, or `null` when the planned message repeats until it is cancelled.
     */
    readonly maxRunCount: number | null;

    /**
     * Number of wake-ups that already happened.
     */
    readonly runCount: number;
};

/**
 * Serializable summary of one planned goal-chat message.
 */
export type AgentGoalChatPlannedMessageItem = AgentGoalChatPlannedMessageScheduleFields & {
    readonly timeoutId: string;
    readonly status: UserChatTimeoutStatus;
    readonly isPaused: boolean;
};

/**
 * Result returned after scheduling one planned goal-chat message.
 */
export type SetAgentGoalChatPlannedMessageResult = AgentGoalChatPlannedMessageScheduleFields & {
    readonly action: 'set';
    readonly status: 'set';
    readonly timeoutId: string;
};

/**
 * Result returned after changing the schedule of one planned goal-chat message.
 *
 * The schedule fields are absent when there was no such planned message to change. A planned message
 * which is firing right now reports `busy` together with the schedule it still has, because its
 * schedule is being consumed by that very firing and is therefore left untouched.
 */
export type UpdateAgentGoalChatPlannedMessageResult = Partial<AgentGoalChatPlannedMessageScheduleFields> & {
    readonly action: 'update';
    readonly status: 'updated' | 'busy' | 'not_found';
    readonly timeoutId: string;
};

/**
 * Result returned after listing planned goal-chat messages.
 */
export type ListAgentGoalChatPlannedMessagesResult = {
    readonly action: 'list';
    readonly status: 'listed';
    readonly items: ReadonlyArray<AgentGoalChatPlannedMessageItem>;
    readonly total: number;
};

/**
 * Result returned after trying to cancel one planned goal-chat message.
 */
export type CancelAgentGoalChatPlannedMessageResult = {
    readonly action: 'cancel';
    readonly status: 'cancelled' | 'not_found';
    readonly timeoutId: string;
    readonly dueAt?: string;
};

/**
 * Schedule an agent may request for one planned message.
 *
 * Every field is untrusted, and leaving all of them out is only allowed when updating the message text
 * of an existing planned message.
 */
export type AgentGoalChatPlannedMessageScheduleRequest = {
    readonly milliseconds?: unknown;
    readonly cronExpression?: unknown;
    readonly startsAt?: unknown;
    readonly endsAt?: unknown;
    readonly maxRunCount?: unknown;
};

/**
 * Shared operations used by both model tools and the coding-agent runtime API.
 *
 * A planned message can repeat like `setInterval`, wake the agent a bounded number of times, run only
 * inside a date window, or fire just once — and it can be re-planned or cancelled at any time from any
 * invocation of the agent.
 */
export type AgentGoalChatPlannedMessageActions = {
    /**
     * Plans one message, where the schedule says how and how long it repeats.
     */
    readonly set: (
        options: AgentGoalChatPlannedMessageScheduleRequest & {
            readonly agentPermanentId: string;
            readonly message: unknown;
        },
    ) => Promise<SetAgentGoalChatPlannedMessageResult>;

    /**
     * Changes the schedule or the text of one already planned message, keeping its identity.
     */
    readonly update: (
        options: AgentGoalChatPlannedMessageScheduleRequest & {
            readonly agentPermanentId: string;
            readonly timeoutId: unknown;
            readonly message?: unknown;
        },
    ) => Promise<UpdateAgentGoalChatPlannedMessageResult>;

    readonly list: (options: {
        readonly agentPermanentId: string;
        readonly isIncludingFinished?: unknown;
        readonly limit?: unknown;
    }) => Promise<ListAgentGoalChatPlannedMessagesResult>;

    readonly cancel: (options: {
        readonly agentPermanentId: string;
        readonly timeoutId: unknown;
    }) => Promise<CancelAgentGoalChatPlannedMessageResult>;
};

/**
 * Persistence dependencies used by planned-message actions.
 */
export type AgentGoalChatPlannedMessageDependencies = {
    readonly ensureAgentGoalChat: (agentPermanentId: string) => Promise<AgentGoalChatPlannedMessageTarget>;
    readonly scheduleThreadScopedUserChatTimeout: typeof scheduleThreadScopedUserChatTimeout;
    readonly listAgentUserChatTimeouts: typeof listAgentUserChatTimeouts;
    readonly getAgentScopedUserChatTimeout: typeof getAgentScopedUserChatTimeout;
    readonly updateScheduledUserChatTimeout: typeof updateScheduledUserChatTimeout;
    readonly cancelScheduledUserChatTimeout: typeof cancelScheduledUserChatTimeout;
};

/**
 * Production persistence dependencies for planned-message actions.
 */
const AGENT_GOAL_CHAT_PLANNED_MESSAGE_DEPENDENCIES: AgentGoalChatPlannedMessageDependencies = {
    ensureAgentGoalChat,
    scheduleThreadScopedUserChatTimeout,
    listAgentUserChatTimeouts,
    getAgentScopedUserChatTimeout,
    updateScheduledUserChatTimeout,
    cancelScheduledUserChatTimeout,
};

/**
 * Creates the shared planned-message operations for one agent's singleton goal chat.
 *
 * @param dependencyOverrides - Optional persistence substitutions used by focused tests.
 * @returns Scheduling, re-planning, listing, and cancellation operations with normalized serializable results.
 */
export function createAgentGoalChatPlannedMessageActions(
    dependencyOverrides: Partial<AgentGoalChatPlannedMessageDependencies> = {},
): AgentGoalChatPlannedMessageActions {
    const dependencies: AgentGoalChatPlannedMessageDependencies = {
        ...AGENT_GOAL_CHAT_PLANNED_MESSAGE_DEPENDENCIES,
        ...dependencyOverrides,
    };

    return {
        async set(options): Promise<SetAgentGoalChatPlannedMessageResult> {
            const agentPermanentId = parseRequiredText(options.agentPermanentId, 'agentPermanentId');
            const schedule = parsePlannedMessageSchedule(createPlannedMessageScheduleInput(options));
            const message = parseRequiredText(options.message, 'message');
            const goalChat = await dependencies.ensureAgentGoalChat(agentPermanentId);
            const plannedMessage = await dependencies.scheduleThreadScopedUserChatTimeout({
                userId: goalChat.userId,
                agentPermanentId,
                chatId: goalChat.id,
                recurrenceIntervalMs: schedule.recurrenceIntervalMs,
                cronExpression: schedule.cronExpression,
                startsAt: schedule.startsAt,
                endsAt: schedule.endsAt,
                maxRunCount: schedule.maxRunCount,
                message,
            });

            return {
                action: 'set',
                status: 'set',
                timeoutId: plannedMessage.timeoutId,
                ...createPlannedMessageScheduleFields(plannedMessage),
            };
        },

        async update(options): Promise<UpdateAgentGoalChatPlannedMessageResult> {
            const agentPermanentId = parseRequiredText(options.agentPermanentId, 'agentPermanentId');
            const timeoutId = parseRequiredText(options.timeoutId, 'timeoutId');
            const existingPlannedMessage = await dependencies.getAgentScopedUserChatTimeout({
                agentPermanentId,
                timeoutId,
            });

            if (!isActivePlannedMessage(existingPlannedMessage)) {
                return { action: 'update', status: 'not_found', timeoutId };
            }

            if (existingPlannedMessage.status === 'RUNNING') {
                // Note: A firing planned message is being re-armed from its stored schedule right now,
                //       so changing that schedule underneath the firing would be silently overwritten
                return {
                    action: 'update',
                    status: 'busy',
                    timeoutId,
                    ...createPlannedMessageScheduleFields(existingPlannedMessage),
                };
            }

            const patch = createPlannedMessagePatch(existingPlannedMessage, options);
            const updatedPlannedMessage = await dependencies.updateScheduledUserChatTimeout({
                agentPermanentId,
                timeoutId,
                patch,
            });

            if (!updatedPlannedMessage) {
                return { action: 'update', status: 'not_found', timeoutId };
            }

            return {
                action: 'update',
                status: 'updated',
                timeoutId,
                ...createPlannedMessageScheduleFields(updatedPlannedMessage),
            };
        },

        async list(options): Promise<ListAgentGoalChatPlannedMessagesResult> {
            const agentPermanentId = parseRequiredText(options.agentPermanentId, 'agentPermanentId');
            const isIncludingFinished = options.isIncludingFinished === true;
            const limit = parseListLimit(options.limit);
            const plannedMessages = await dependencies.listAgentUserChatTimeouts({
                agentPermanentId,
                ...(isIncludingFinished ? {} : { statuses: ACTIVE_PLANNED_MESSAGE_STATUSES }),
                limit,
            });
            const items = [...plannedMessages]
                .sort((leftMessage, rightMessage) => leftMessage.dueAt.localeCompare(rightMessage.dueAt))
                .map(createPlannedMessageListItem);

            return {
                action: 'list',
                status: 'listed',
                items,
                total: items.length,
            };
        },

        async cancel(options): Promise<CancelAgentGoalChatPlannedMessageResult> {
            const agentPermanentId = parseRequiredText(options.agentPermanentId, 'agentPermanentId');
            const timeoutId = parseRequiredText(options.timeoutId, 'timeoutId');
            const existingPlannedMessage = await dependencies.getAgentScopedUserChatTimeout({
                agentPermanentId,
                timeoutId,
            });

            if (!isActivePlannedMessage(existingPlannedMessage)) {
                return {
                    action: 'cancel',
                    status: 'not_found',
                    timeoutId,
                };
            }

            const cancelledPlannedMessage = await dependencies.cancelScheduledUserChatTimeout(timeoutId);
            const isCancelled = Boolean(cancelledPlannedMessage?.cancelRequestedAt);

            return {
                action: 'cancel',
                status: isCancelled ? 'cancelled' : 'not_found',
                timeoutId,
                ...(cancelledPlannedMessage?.dueAt ? { dueAt: cancelledPlannedMessage.dueAt } : {}),
            };
        },
    };
}

/**
 * Production planned-message operations shared by Agents Server execution adapters.
 */
export const AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS = createAgentGoalChatPlannedMessageActions();

/**
 * Collects the untrusted schedule fields of one planned-message request.
 *
 * @param request - Schedule requested by an agent.
 * @returns Schedule input of the shared schedule parser.
 */
function createPlannedMessageScheduleInput(
    request: AgentGoalChatPlannedMessageScheduleRequest,
): PlannedMessageScheduleInput {
    return {
        milliseconds: request.milliseconds,
        cronExpression: request.cronExpression,
        startsAt: request.startsAt,
        endsAt: request.endsAt,
        maxRunCount: request.maxRunCount,
    };
}

/**
 * Builds the stored patch of one re-planned message.
 *
 * Only the requested fields change: the schedule is re-validated as a whole against the fields that
 * stay, and the next wake-up is moved to the first one the new schedule allows.
 *
 * @param existingPlannedMessage - Planned message being changed.
 * @param request - Schedule and message requested by the agent.
 * @returns Patch written to the stored planned message.
 */
function createPlannedMessagePatch(
    existingPlannedMessage: UserChatTimeoutRecord,
    request: AgentGoalChatPlannedMessageScheduleRequest & { readonly message?: unknown },
): UpdateAgentScopedUserChatTimeoutPatch {
    const isMessageRequested = request.message !== undefined;
    const messagePatch = isMessageRequested ? { message: parseRequiredText(request.message, 'message') } : {};

    if (!isPlannedMessageScheduleRequested(request)) {
        if (!isMessageRequested) {
            throw new ParseError(
                spaceTrim(`
                    Nothing to change in this planned message.

                    - Pass at least one of \`cronExpression\`, \`milliseconds\`, \`startsAt\`, \`endsAt\`, \`maxRunCount\`, or \`message\`.
                `),
            );
        }

        return messagePatch;
    }

    const schedule = parsePlannedMessageSchedule(
        createMergedPlannedMessageScheduleInput(existingPlannedMessage, request),
    );
    const dueAtDate = resolvePlannedMessageDueAt({
        schedule,
        completedRunCount: existingPlannedMessage.runCount,
        afterDate: new Date(),
    });

    if (dueAtDate === null) {
        throw new ParseError(
            spaceTrim(`
                This change would leave the planned message without any wake-up ahead.

                - Its schedule would already be over, for example because \`endsAt\` is in the past or \`maxRunCount\` is not above the ${existingPlannedMessage.runCount} run(s) it already did.
                - **Cancel** the planned message instead when it should stop.
            `),
        );
    }

    return {
        ...messagePatch,
        dueAt: dueAtDate.toISOString(),
        recurrenceIntervalMs: schedule.recurrenceIntervalMs,
        cronExpression: schedule.cronExpression,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        maxRunCount: schedule.maxRunCount,
    };
}

/**
 * Merges one requested schedule change into the schedule a planned message already has.
 *
 * Choosing a cron drops the fixed interval and choosing an interval drops the cron, because one
 * planned message follows exactly one recurrence rule.
 *
 * @param existingPlannedMessage - Planned message being changed.
 * @param request - Schedule requested by the agent.
 * @returns Schedule input describing the planned message after the change.
 */
function createMergedPlannedMessageScheduleInput(
    existingPlannedMessage: UserChatTimeoutRecord,
    request: AgentGoalChatPlannedMessageScheduleRequest,
): PlannedMessageScheduleInput {
    const isCronRequested = Boolean(request.cronExpression);
    const isIntervalRequested = request.milliseconds !== undefined && request.milliseconds !== null;

    return {
        milliseconds: isCronRequested
            ? null
            : resolveRequestedScheduleValue(request.milliseconds, existingPlannedMessage.recurrenceIntervalMs),
        cronExpression: isIntervalRequested
            ? null
            : resolveRequestedScheduleValue(request.cronExpression, existingPlannedMessage.cronExpression),
        startsAt: resolveRequestedScheduleValue(request.startsAt, existingPlannedMessage.startsAt),
        endsAt: resolveRequestedScheduleValue(request.endsAt, existingPlannedMessage.endsAt),
        maxRunCount: resolveRequestedScheduleValue(request.maxRunCount, existingPlannedMessage.maxRunCount),
    };
}

/**
 * Keeps the stored value of one schedule field that was not part of the request.
 *
 * @param requestedValue - Untrusted value from the request, where `undefined` means "not requested".
 * @param storedValue - Value the planned message has today.
 * @returns Value describing the field after the change.
 */
function resolveRequestedScheduleValue(requestedValue: unknown, storedValue: unknown): unknown {
    return requestedValue === undefined ? storedValue : requestedValue;
}

/**
 * Determines whether one request changes the schedule instead of only the message text.
 *
 * @param request - Schedule requested by the agent.
 * @returns `true` when at least one schedule field was requested.
 */
function isPlannedMessageScheduleRequested(request: AgentGoalChatPlannedMessageScheduleRequest): boolean {
    return (
        request.milliseconds !== undefined ||
        request.cronExpression !== undefined ||
        request.startsAt !== undefined ||
        request.endsAt !== undefined ||
        request.maxRunCount !== undefined
    );
}

/**
 * Parses one required non-empty string argument.
 *
 * @param rawValue - Untrusted argument value.
 * @param fieldName - Field name used in a detailed parse error.
 * @returns Trimmed text.
 */
function parseRequiredText(rawValue: unknown, fieldName: 'agentPermanentId' | 'message' | 'timeoutId'): string {
    if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message arguments.

                - \`${fieldName}\` must be a non-empty string.
            `),
        );
    }

    return rawValue.trim();
}

/**
 * Parses and bounds one requested listing size.
 *
 * @param rawLimit - Optional untrusted limit.
 * @returns Whole limit in the supported range.
 */
function parseListLimit(rawLimit: unknown): number {
    if (rawLimit === undefined || rawLimit === null) {
        return DEFAULT_LISTED_PLANNED_MESSAGES_LIMIT;
    }

    const limit = Number(rawLimit);
    if (!Number.isFinite(limit) || limit < 1 || limit > MAX_LISTED_PLANNED_MESSAGES_LIMIT) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message list limit.

                - \`limit\` must be a positive number no greater than \`${MAX_LISTED_PLANNED_MESSAGES_LIMIT}\`.
            `),
        );
    }

    return Math.floor(limit);
}

/**
 * Maps one durable timeout row into the schedule shared by every planned-message result.
 *
 * @param plannedMessage - Stored timeout row.
 * @returns Serializable schedule of the planned message.
 */
function createPlannedMessageScheduleFields(
    plannedMessage: UserChatTimeoutRecord,
): AgentGoalChatPlannedMessageScheduleFields {
    return {
        dueAt: plannedMessage.dueAt,
        message: plannedMessage.message,
        intervalMs: plannedMessage.recurrenceIntervalMs,
        cronExpression: plannedMessage.cronExpression,
        startsAt: plannedMessage.startsAt,
        endsAt: plannedMessage.endsAt,
        maxRunCount: plannedMessage.maxRunCount,
        runCount: plannedMessage.runCount,
    };
}

/**
 * Maps one durable timeout row into the model-facing planned-message shape.
 *
 * @param plannedMessage - Stored timeout row.
 * @returns Serializable planned-message summary.
 */
function createPlannedMessageListItem(plannedMessage: UserChatTimeoutRecord): AgentGoalChatPlannedMessageItem {
    return {
        timeoutId: plannedMessage.timeoutId,
        status: plannedMessage.status,
        isPaused: Boolean(plannedMessage.pausedAt),
        ...createPlannedMessageScheduleFields(plannedMessage),
    };
}

/**
 * Determines whether one timeout can still be changed or cancelled.
 *
 * @param plannedMessage - Stored timeout or a missing lookup result.
 * @returns `true` for active messages without an existing cancellation request.
 */
function isActivePlannedMessage(plannedMessage: UserChatTimeoutRecord | null): plannedMessage is UserChatTimeoutRecord {
    return Boolean(
        plannedMessage &&
            ACTIVE_PLANNED_MESSAGE_STATUSES.includes(plannedMessage.status) &&
            !plannedMessage.cancelRequestedAt,
    );
}
