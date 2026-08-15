import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';
import type { UserChatTimeoutRecord, UserChatTimeoutStatus } from '../userChatTimeout';
import {
    cancelScheduledUserChatTimeout,
    getAgentScopedUserChatTimeout,
    listAgentUserChatTimeouts,
    scheduleThreadScopedUserChatTimeout,
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
 * Shortest repeat interval one agent may plan for itself.
 *
 * Planned messages repeat like `setInterval`, so an interval below one minute would turn the goal
 * chat into an unattended self-invocation loop instead of a plan.
 */
const MINIMUM_PLANNED_MESSAGE_INTERVAL_MS = 60_000;

/**
 * Minimal goal-chat identity needed when scheduling a planned message.
 */
type AgentGoalChatPlannedMessageTarget = {
    readonly id: string;
    readonly userId: number;
};

/**
 * Serializable summary of one planned goal-chat message.
 */
export type AgentGoalChatPlannedMessageItem = {
    readonly timeoutId: string;
    readonly status: UserChatTimeoutStatus;
    readonly dueAt: string;
    readonly isPaused: boolean;
    readonly message: string | null;

    /**
     * Repeat interval in milliseconds, or `null` for a planned message that wakes the agent only once.
     */
    readonly intervalMs: number | null;
};

/**
 * Result returned after scheduling one planned goal-chat message.
 */
export type SetAgentGoalChatPlannedMessageResult = {
    readonly action: 'set';
    readonly status: 'set';
    readonly timeoutId: string;
    readonly dueAt: string;
    readonly message: string | null;

    /**
     * Repeat interval in milliseconds of the scheduled planned message.
     */
    readonly intervalMs: number | null;
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
 * Shared operations used by both model tools and the coding-agent runtime API.
 *
 * Planned messages behave like `setInterval`: `set` starts a repeating wake-up and only `cancel`
 * stops it, so an agent that is happy with its plan does not have to do anything.
 */
export type AgentGoalChatPlannedMessageActions = {
    /**
     * Starts one repeating planned message, where `milliseconds` is its repeat interval.
     */
    readonly set: (options: {
        readonly agentPermanentId: string;
        readonly milliseconds: unknown;
        readonly message: unknown;
    }) => Promise<SetAgentGoalChatPlannedMessageResult>;
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
    cancelScheduledUserChatTimeout,
};

/**
 * Creates the shared planned-message operations for one agent's singleton goal chat.
 *
 * @param dependencyOverrides - Optional persistence substitutions used by focused tests.
 * @returns Scheduling, listing, and cancellation operations with normalized serializable results.
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
            const intervalMs = parsePlannedMessageIntervalMs(options.milliseconds);
            const message = parseRequiredText(options.message, 'message');
            const goalChat = await dependencies.ensureAgentGoalChat(agentPermanentId);
            // Note: A planned message repeats like `setInterval`, so the requested delay is also its interval
            const plannedMessage = await dependencies.scheduleThreadScopedUserChatTimeout({
                userId: goalChat.userId,
                agentPermanentId,
                chatId: goalChat.id,
                durationMs: intervalMs,
                recurrenceIntervalMs: intervalMs,
                message,
            });

            return {
                action: 'set',
                status: 'set',
                timeoutId: plannedMessage.timeoutId,
                dueAt: plannedMessage.dueAt,
                message: plannedMessage.message,
                intervalMs: plannedMessage.recurrenceIntervalMs,
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
 * Parses one planned-message repeat interval.
 *
 * @param rawMilliseconds - Untrusted interval supplied by a model or runtime API.
 * @returns Repeat interval in whole milliseconds.
 */
function parsePlannedMessageIntervalMs(rawMilliseconds: unknown): number {
    const milliseconds = Number(rawMilliseconds);

    if (!Number.isFinite(milliseconds) || milliseconds < MINIMUM_PLANNED_MESSAGE_INTERVAL_MS) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message interval.

                - A planned message **repeats** at this interval until it is cancelled.
                - \`milliseconds\` must be a number of at least \`${MINIMUM_PLANNED_MESSAGE_INTERVAL_MS}\`.
            `),
        );
    }

    return Math.floor(milliseconds);
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
 * Maps one durable timeout row into the model-facing planned-message shape.
 *
 * @param plannedMessage - Stored timeout row.
 * @returns Serializable planned-message summary.
 */
function createPlannedMessageListItem(plannedMessage: UserChatTimeoutRecord): AgentGoalChatPlannedMessageItem {
    return {
        timeoutId: plannedMessage.timeoutId,
        status: plannedMessage.status,
        dueAt: plannedMessage.dueAt,
        isPaused: Boolean(plannedMessage.pausedAt),
        message: plannedMessage.message,
        intervalMs: plannedMessage.recurrenceIntervalMs,
    };
}

/**
 * Determines whether one timeout can still be cancelled.
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
