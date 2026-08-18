import type { PlannedMessageEndReason } from './plannedMessageManager/resolvePlannedMessageEndReason';
import type { PlannedMessageLifecycle } from './plannedMessageManager/resolvePlannedMessageLifecycle';
import type { PlannedMessageRecurrenceKind } from './plannedMessageManager/resolvePlannedMessageRecurrenceKind';
import type { UserChatTimeoutStatus } from './userChatTimeout/UserChatTimeoutRecord';

/**
 * One planned message (durable chat timeout) as shown in the admin planned-message manager.
 *
 * This is the whole planned message, not the queue view of it the task manager shows: it carries the
 * schedule the agent planned, where that plan stands now, and who it belongs to.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerRecord = {
    timeoutId: string;
    status: UserChatTimeoutStatus;
    lifecycle: PlannedMessageLifecycle;
    recurrenceKind: PlannedMessageRecurrenceKind;
    endReason: PlannedMessageEndReason;
    message: string | null;

    createdAt: string;
    updatedAt: string;
    dueAt: string;
    startsAt: string | null;
    endsAt: string | null;
    lastFiredAt: string | null;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    pausedAt: string | null;

    recurrenceIntervalMs: number | null;
    cronExpression: string | null;
    maxRunCount: number | null;
    runCount: number;
    attemptCount: number;
    failureReason: string | null;

    userId: number;
    username: string | null;
    agentPermanentId: string;
    agentName: string | null;
    chatId: string;

    /**
     * True when the planned message lives in the agent's own goal chat, which is where an agent plans
     * its own work.
     */
    isAgentGoalChat: boolean;
};

/**
 * Full payload returned by the admin planned-message listing endpoint.
 *
 * The whole bounded set is returned at once, so filtering, sorting, and counting all see the same
 * rows and can never disagree with each other.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerListResponse = {
    items: Array<PlannedMessageManagerRecord>;
    generatedAt: string;

    /**
     * True when more planned messages exist than the endpoint is willing to return at once.
     */
    hasMore: boolean;
};

/**
 * Stage filter offered by the planned-message manager.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerView =
    | 'active'
    | 'scheduled'
    | 'not-started'
    | 'ongoing'
    | 'paused'
    | 'finished'
    | 'all';

/**
 * Recurrence (frequency) filter offered by the planned-message manager.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerRecurrenceFilter = 'all' | PlannedMessageRecurrenceKind;

/**
 * Last-run filter offered by the planned-message manager.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerLastRunFilter = 'all' | 'never' | 'hour' | 'day' | 'week' | 'older';

/**
 * Sortable planned-message manager columns.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerSortField =
    | 'plannedMessage'
    | 'agent'
    | 'frequency'
    | 'nextRun'
    | 'lastRun'
    | 'runs'
    | 'state';

/**
 * Change requested for one planned message by an administrator.
 *
 * Leaving a field out keeps it as it is and passing `null` removes the bound, exactly like the
 * re-planning an agent can do itself.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerUpdatePayload = {
    message?: string;
    milliseconds?: number | null;
    cronExpression?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    maxRunCount?: number | null;

    /**
     * Whether the planned message should be held back from waking its agent.
     */
    isPaused?: boolean;
};

/**
 * Route of the admin planned-message manager API.
 *
 * @private internal admin utility of Agents Server
 */
const ADMIN_PLANNED_MESSAGES_API_PATH = '/api/admin/planned-messages';

/**
 * Fetches every planned message of this server for the admin manager.
 *
 * @private internal admin utility of Agents Server
 */
export async function $fetchAdminPlannedMessages(): Promise<PlannedMessageManagerListResponse> {
    const response = await fetch(ADMIN_PLANNED_MESSAGES_API_PATH, { method: 'GET' });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load planned messages.');
    }

    return (await response.json()) as PlannedMessageManagerListResponse;
}

/**
 * Applies one administrator change to a planned message.
 *
 * @private internal admin utility of Agents Server
 */
export async function $updateAdminPlannedMessage(
    timeoutId: string,
    payload: PlannedMessageManagerUpdatePayload,
): Promise<PlannedMessageManagerRecord> {
    const response = await fetch(`${ADMIN_PLANNED_MESSAGES_API_PATH}/${encodeURIComponent(timeoutId)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as {
        plannedMessage?: PlannedMessageManagerRecord;
        error?: string;
    };

    if (!response.ok || !data.plannedMessage) {
        throw new Error(data.error || 'Failed to update the planned message.');
    }

    return data.plannedMessage;
}

/**
 * Cancels one planned message so it never wakes its agent again.
 *
 * @private internal admin utility of Agents Server
 */
export async function $cancelAdminPlannedMessage(timeoutId: string): Promise<void> {
    const response = await fetch(`${ADMIN_PLANNED_MESSAGES_API_PATH}/${encodeURIComponent(timeoutId)}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to cancel the planned message.');
    }
}
