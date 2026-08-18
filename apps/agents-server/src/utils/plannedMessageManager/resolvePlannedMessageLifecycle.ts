import type { UserChatTimeoutStatus } from '../userChatTimeout/UserChatTimeoutRecord';

/**
 * Stage one planned message is in, as shown by the planned-message manager.
 *
 * The stored `UserChatTimeoutStatus` alone cannot answer this: a queued planned message may be
 * waiting for its own starting date, may be paused, or may already have a cancellation on its way,
 * and all three look like `QUEUED` in the database.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageLifecycle =
    | 'ONGOING'
    | 'SCHEDULED'
    | 'NOT_STARTED'
    | 'PAUSED'
    | 'CANCELLED'
    | 'ENDED'
    | 'FAILED';

/**
 * Stored fields needed to tell which stage one planned message is in.
 *
 * Both a durable timeout row and one manager row satisfy this shape, so the very same rule decides
 * the stage on the server and in the browser.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageLifecycleInput = {
    readonly status: UserChatTimeoutStatus;
    readonly pausedAt: string | null;
    readonly cancelRequestedAt: string | null;
    readonly startsAt: string | null;
};

/**
 * Resolves the stage one planned message is in.
 *
 * @param plannedMessage - Stored planned message.
 * @param atDate - Moment the stage is judged at.
 * @returns Stage of the planned message.
 *
 * @private internal admin utility of Agents Server
 */
export function resolvePlannedMessageLifecycle(
    plannedMessage: PlannedMessageLifecycleInput,
    atDate: Date,
): PlannedMessageLifecycle {
    if (plannedMessage.status === 'RUNNING') {
        return 'ONGOING';
    }

    if (plannedMessage.status === 'FAILED') {
        return 'FAILED';
    }

    if (plannedMessage.status === 'CANCELLED') {
        return 'CANCELLED';
    }

    if (plannedMessage.status === 'COMPLETED') {
        return 'ENDED';
    }

    // Note: A cancellation is requested on the row first and only turned into `CANCELLED` by the
    //       worker, so a queued row carrying that request is already on its way out
    if (plannedMessage.cancelRequestedAt !== null) {
        return 'CANCELLED';
    }

    if (plannedMessage.pausedAt !== null) {
        return 'PAUSED';
    }

    if (isPlannedMessageWaitingForStartingDate(plannedMessage.startsAt, atDate)) {
        return 'NOT_STARTED';
    }

    return 'SCHEDULED';
}

/**
 * Determines whether one planned message may not wake its agent yet because its window has not opened.
 *
 * @param startsAt - Moment before which the planned message never wakes the agent.
 * @param atDate - Moment the stage is judged at.
 * @returns `true` while the starting date is still ahead.
 *
 * @private function of `resolvePlannedMessageLifecycle`
 */
function isPlannedMessageWaitingForStartingDate(startsAt: string | null, atDate: Date): boolean {
    if (startsAt === null) {
        return false;
    }

    const startsAtTime = Date.parse(startsAt);

    return Number.isFinite(startsAtTime) && startsAtTime > atDate.getTime();
}
