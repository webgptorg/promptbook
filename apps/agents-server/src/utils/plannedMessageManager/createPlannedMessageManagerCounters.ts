import type { PlannedMessageManagerRecord, PlannedMessageManagerView } from '../plannedMessagesAdmin';
import { PLANNED_MESSAGE_LIFECYCLES_BY_VIEW } from './filterPlannedMessages';
import type { PlannedMessageLifecycle } from './resolvePlannedMessageLifecycle';

/**
 * How many planned messages stand in each stage right now.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerCounters = {
    readonly countByLifecycle: Record<PlannedMessageLifecycle, number>;
    readonly totalCount: number;

    /**
     * Earliest moment any planned message is going to wake its agent, or `null` when none will.
     */
    readonly nextDueAt: string | null;
};

/**
 * Stages that still have a wake-up ahead of them.
 *
 * @private constant of `createPlannedMessageManagerCounters`
 */
const UPCOMING_PLANNED_MESSAGE_LIFECYCLES: ReadonlyArray<PlannedMessageLifecycle> = ['SCHEDULED', 'NOT_STARTED'];

/**
 * Counts the planned messages of each stage and finds the next wake-up ahead.
 *
 * @param plannedMessages - All planned messages of the server.
 * @returns Counters rendered above the planned-message table.
 *
 * @private internal admin utility of Agents Server
 */
export function createPlannedMessageManagerCounters(
    plannedMessages: ReadonlyArray<PlannedMessageManagerRecord>,
): PlannedMessageManagerCounters {
    const countByLifecycle: Record<PlannedMessageLifecycle, number> = {
        ONGOING: 0,
        SCHEDULED: 0,
        NOT_STARTED: 0,
        PAUSED: 0,
        CANCELLED: 0,
        ENDED: 0,
        FAILED: 0,
    };
    let nextDueAt: string | null = null;

    for (const plannedMessage of plannedMessages) {
        countByLifecycle[plannedMessage.lifecycle] += 1;

        if (UPCOMING_PLANNED_MESSAGE_LIFECYCLES.includes(plannedMessage.lifecycle)) {
            nextDueAt = resolveEarlierDate(nextDueAt, plannedMessage.dueAt);
        }
    }

    return {
        countByLifecycle,
        totalCount: plannedMessages.length,
        nextDueAt,
    };
}

/**
 * Counts the planned messages one manager view lists.
 *
 * @param counters - Counters of every stage.
 * @param view - View whose size is asked for.
 * @returns Number of planned messages the view lists before any other filter narrows it.
 *
 * @private internal admin utility of Agents Server
 */
export function resolvePlannedMessageManagerViewCount(
    counters: PlannedMessageManagerCounters,
    view: PlannedMessageManagerView,
): number {
    return PLANNED_MESSAGE_LIFECYCLES_BY_VIEW[view].reduce(
        (viewCount, lifecycle) => viewCount + counters.countByLifecycle[lifecycle],
        0,
    );
}

/**
 * Keeps whichever of two moments comes first.
 *
 * @param currentDate - Earliest moment found so far, or `null`.
 * @param candidateDate - Moment being considered.
 * @returns Earlier of the two moments.
 *
 * @private function of `createPlannedMessageManagerCounters`
 */
function resolveEarlierDate(currentDate: string | null, candidateDate: string): string | null {
    const candidateTime = Date.parse(candidateDate);

    if (!Number.isFinite(candidateTime)) {
        return currentDate;
    }

    if (currentDate === null) {
        return candidateDate;
    }

    return candidateTime < Date.parse(currentDate) ? candidateDate : currentDate;
}
