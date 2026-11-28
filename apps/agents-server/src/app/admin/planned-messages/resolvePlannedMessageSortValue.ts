'use client';

import { isPlannedMessageStillPlanned } from '@/src/utils/plannedMessageManager/isPlannedMessageStillPlanned';
import type { PlannedMessageLifecycle } from '@/src/utils/plannedMessageManager/resolvePlannedMessageLifecycle';
import type { PlannedMessageManagerRecord, PlannedMessageManagerSortField } from '@/src/utils/plannedMessagesAdmin';
import type { AdminTableSortableValue, AdminTableSortOrder } from '../_components/adminTableSorting';
import { resolvePlannedMessageText } from './plannedMessageManagerPresentation';

/**
 * Order the stages are sorted in, from the most immediate to the most finished.
 *
 * @private function of PlannedMessageManagerClient
 */
const PLANNED_MESSAGE_LIFECYCLE_SORT_RANK: Record<PlannedMessageLifecycle, number> = {
    ONGOING: 0,
    SCHEDULED: 1,
    NOT_STARTED: 2,
    PAUSED: 3,
    CANCELLED: 4,
    ENDED: 5,
    FAILED: 6,
};

/**
 * Sort value standing for a planned message that repeats on a cron.
 *
 * A cron cadence cannot be compared with a fixed interval without evaluating it, so cron-driven
 * messages are sorted after every fixed interval but before the ones that never repeat.
 *
 * @private function of PlannedMessageManagerClient
 */
const CRON_PLANNED_MESSAGE_FREQUENCY_SORT_VALUE = Number.MAX_SAFE_INTEGER - 1;

/**
 * Sort value standing for a planned message that wakes its agent exactly once.
 *
 * @private function of PlannedMessageManagerClient
 */
const SINGLE_RUN_PLANNED_MESSAGE_FREQUENCY_SORT_VALUE = Number.MAX_SAFE_INTEGER;

/**
 * Resolves the comparable value of one planned message for the active sort column.
 *
 * Sorting by frequency puts the most frequently repeating planned messages first, because that is the
 * order an administrator looks for when asking which plan is costing the most wake-ups.
 *
 * @param plannedMessage - Planned message being sorted.
 * @param sortBy - Column the table is sorted by.
 * @returns Comparable value of the planned message.
 *
 * @private function of PlannedMessageManagerClient
 */
export function resolvePlannedMessageSortValue(
    plannedMessage: PlannedMessageManagerRecord,
    sortBy: PlannedMessageManagerSortField,
): AdminTableSortableValue {
    if (sortBy === 'plannedMessage') {
        return resolvePlannedMessageText(plannedMessage);
    }

    if (sortBy === 'agent') {
        return plannedMessage.agentName || plannedMessage.agentPermanentId;
    }

    if (sortBy === 'frequency') {
        return resolvePlannedMessageFrequencySortValue(plannedMessage);
    }

    if (sortBy === 'nextRun') {
        // Note: A planned message that is over has no wake-up ahead, so it sorts after every one that has
        return isPlannedMessageStillPlanned(plannedMessage.lifecycle) ? new Date(plannedMessage.dueAt) : null;
    }

    if (sortBy === 'lastRun') {
        return plannedMessage.lastFiredAt === null ? null : new Date(plannedMessage.lastFiredAt);
    }

    if (sortBy === 'runs') {
        return plannedMessage.runCount;
    }

    return PLANNED_MESSAGE_LIFECYCLE_SORT_RANK[plannedMessage.lifecycle];
}

/**
 * Resolves the initial direction used when switching planned-message sort columns.
 *
 * @param sortBy - Column the table is being sorted by.
 * @returns Direction that reads most naturally for that column.
 *
 * @private function of PlannedMessageManagerClient
 */
export function resolvePlannedMessageManagerDefaultSortOrder(
    sortBy: PlannedMessageManagerSortField,
): AdminTableSortOrder {
    return sortBy === 'lastRun' || sortBy === 'runs' ? 'desc' : 'asc';
}

/**
 * Resolves how often one planned message repeats, as a comparable period in milliseconds.
 *
 * @param plannedMessage - Planned message being sorted.
 * @returns Repeat period, or a sentinel standing for cron-driven and one-off messages.
 *
 * @private function of `resolvePlannedMessageSortValue`
 */
function resolvePlannedMessageFrequencySortValue(plannedMessage: PlannedMessageManagerRecord): number {
    if (plannedMessage.recurrenceKind === 'INTERVAL') {
        return plannedMessage.recurrenceIntervalMs || 0;
    }

    return plannedMessage.recurrenceKind === 'CRON'
        ? CRON_PLANNED_MESSAGE_FREQUENCY_SORT_VALUE
        : SINGLE_RUN_PLANNED_MESSAGE_FREQUENCY_SORT_VALUE;
}
