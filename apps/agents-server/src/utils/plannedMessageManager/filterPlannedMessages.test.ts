import { describe, expect, it } from '@jest/globals';
import type { PlannedMessageManagerRecord } from '../plannedMessagesAdmin';
import { createPlannedMessageManagerCounters } from './createPlannedMessageManagerCounters';
import { filterPlannedMessages, type PlannedMessageManagerFilters } from './filterPlannedMessages';

/**
 * Moment every last-run window in these tests is measured from.
 */
const NOW_DATE = new Date('2026-08-18T10:00:00.000Z');

/**
 * Filters that keep every planned message.
 */
const ALL_PLANNED_MESSAGES_FILTERS: PlannedMessageManagerFilters = {
    view: 'all',
    agentPermanentId: 'all',
    recurrence: 'all',
    lastRun: 'all',
    search: '',
};

/**
 * Creates one scheduled planned message of a repeating plan.
 *
 * @param overrides - Fields specific to one test case.
 * @returns Planned-message manager row.
 */
function createPlannedMessage(overrides: Partial<PlannedMessageManagerRecord> = {}): PlannedMessageManagerRecord {
    return {
        timeoutId: 'tmo_scheduled',
        status: 'QUEUED',
        lifecycle: 'SCHEDULED',
        recurrenceKind: 'INTERVAL',
        endReason: null,
        message: 'Re-check the two projects',
        createdAt: '2026-08-16T10:00:00.000Z',
        updatedAt: '2026-08-18T09:00:00.000Z',
        dueAt: '2026-08-18T10:05:00.000Z',
        startsAt: null,
        endsAt: null,
        lastFiredAt: '2026-08-18T09:00:00.000Z',
        completedAt: null,
        cancelRequestedAt: null,
        pausedAt: null,
        recurrenceIntervalMs: 300_000,
        cronExpression: null,
        maxRunCount: null,
        runCount: 12,
        attemptCount: 1,
        failureReason: null,
        userId: 1,
        username: 'admin',
        agentPermanentId: 'YznZWHGNQPinL1',
        agentName: 'Generic chatter',
        chatId: 'goal-YznZWHGNQPinL1',
        isAgentGoalChat: true,
        ...overrides,
    };
}

/**
 * Collects the ids kept by one set of filters.
 *
 * @param plannedMessages - Planned messages being filtered.
 * @param filterOverrides - Filters specific to one test case.
 * @returns Ids of the kept planned messages.
 */
function filterTimeoutIds(
    plannedMessages: ReadonlyArray<PlannedMessageManagerRecord>,
    filterOverrides: Partial<PlannedMessageManagerFilters>,
): Array<string> {
    return filterPlannedMessages(
        plannedMessages,
        { ...ALL_PLANNED_MESSAGES_FILTERS, ...filterOverrides },
        NOW_DATE,
    ).map((plannedMessage) => plannedMessage.timeoutId);
}

describe('filterPlannedMessages', () => {
    const scheduledMessage = createPlannedMessage();
    const notStartedMessage = createPlannedMessage({
        timeoutId: 'tmo_not_started',
        lifecycle: 'NOT_STARTED',
        recurrenceKind: 'CRON',
        recurrenceIntervalMs: null,
        cronExpression: '0 9 * * 1-5',
        startsAt: '2026-08-20T08:00:00.000Z',
        lastFiredAt: null,
        runCount: 0,
    });
    const ongoingMessage = createPlannedMessage({
        timeoutId: 'tmo_ongoing',
        status: 'RUNNING',
        lifecycle: 'ONGOING',
        lastFiredAt: '2026-08-18T09:59:00.000Z',
    });
    const pausedMessage = createPlannedMessage({
        timeoutId: 'tmo_paused',
        lifecycle: 'PAUSED',
        pausedAt: '2026-08-18T08:00:00.000Z',
        lastFiredAt: '2026-08-10T09:00:00.000Z',
    });
    const cancelledMessage = createPlannedMessage({
        timeoutId: 'tmo_cancelled',
        status: 'CANCELLED',
        lifecycle: 'CANCELLED',
        agentPermanentId: 'OtherAgent01',
        agentName: 'Prague Signal',
        recurrenceKind: 'ONCE',
        recurrenceIntervalMs: null,
        lastFiredAt: null,
    });
    const endedMessage = createPlannedMessage({
        timeoutId: 'tmo_ended',
        status: 'COMPLETED',
        lifecycle: 'ENDED',
        endReason: 'MAX_RUNS_REACHED',
        maxRunCount: 12,
        lastFiredAt: '2026-08-18T09:00:00.000Z',
    });
    const allPlannedMessages = [
        scheduledMessage,
        notStartedMessage,
        ongoingMessage,
        pausedMessage,
        cancelledMessage,
        endedMessage,
    ];

    it('lists everything still planned in the active view', () => {
        expect(filterTimeoutIds(allPlannedMessages, { view: 'active' })).toEqual([
            'tmo_scheduled',
            'tmo_not_started',
            'tmo_ongoing',
            'tmo_paused',
        ]);
    });

    it('separates the future, the not-yet-started, the ongoing, and the finished planned messages', () => {
        expect(filterTimeoutIds(allPlannedMessages, { view: 'scheduled' })).toEqual(['tmo_scheduled']);
        expect(filterTimeoutIds(allPlannedMessages, { view: 'not-started' })).toEqual(['tmo_not_started']);
        expect(filterTimeoutIds(allPlannedMessages, { view: 'ongoing' })).toEqual(['tmo_ongoing']);
        expect(filterTimeoutIds(allPlannedMessages, { view: 'paused' })).toEqual(['tmo_paused']);
        expect(filterTimeoutIds(allPlannedMessages, { view: 'finished' })).toEqual(['tmo_cancelled', 'tmo_ended']);
    });

    it('narrows the listing to one agent, whatever the case of its id', () => {
        expect(filterTimeoutIds(allPlannedMessages, { agentPermanentId: 'otheragent01' })).toEqual(['tmo_cancelled']);
    });

    it('narrows the listing by how often a planned message repeats', () => {
        expect(filterTimeoutIds(allPlannedMessages, { recurrence: 'CRON' })).toEqual(['tmo_not_started']);
        expect(filterTimeoutIds(allPlannedMessages, { recurrence: 'ONCE' })).toEqual(['tmo_cancelled']);
        expect(filterTimeoutIds(allPlannedMessages, { recurrence: 'INTERVAL' })).toEqual([
            'tmo_scheduled',
            'tmo_ongoing',
            'tmo_paused',
            'tmo_ended',
        ]);
    });

    it('narrows the listing by when a planned message last woke its agent', () => {
        expect(filterTimeoutIds(allPlannedMessages, { lastRun: 'never' })).toEqual(['tmo_not_started', 'tmo_cancelled']);
        expect(filterTimeoutIds(allPlannedMessages, { lastRun: 'hour' })).toEqual([
            'tmo_scheduled',
            'tmo_ongoing',
            'tmo_ended',
        ]);
        expect(filterTimeoutIds(allPlannedMessages, { lastRun: 'week' })).toEqual([
            'tmo_scheduled',
            'tmo_ongoing',
            'tmo_ended',
        ]);
        expect(filterTimeoutIds(allPlannedMessages, { lastRun: 'older' })).toEqual(['tmo_paused']);
    });

    it('searches the message, the ids, the agent, and the owner', () => {
        expect(filterTimeoutIds(allPlannedMessages, { search: 'prague' })).toEqual(['tmo_cancelled']);
        expect(filterTimeoutIds(allPlannedMessages, { search: 'tmo_ongoing' })).toEqual(['tmo_ongoing']);
        expect(filterTimeoutIds(allPlannedMessages, { search: 're-check' })).toHaveLength(6);
        expect(filterTimeoutIds(allPlannedMessages, { search: 'nothing here' })).toEqual([]);
    });

    it('combines every filter at once', () => {
        expect(
            filterTimeoutIds(allPlannedMessages, {
                view: 'active',
                agentPermanentId: 'YznZWHGNQPinL1',
                recurrence: 'INTERVAL',
                lastRun: 'hour',
            }),
        ).toEqual(['tmo_scheduled', 'tmo_ongoing']);
    });
});

describe('createPlannedMessageManagerCounters', () => {
    it('counts every stage and finds the earliest wake-up still ahead', () => {
        const counters = createPlannedMessageManagerCounters([
            createPlannedMessage({ dueAt: '2026-08-18T10:05:00.000Z' }),
            createPlannedMessage({ lifecycle: 'NOT_STARTED', dueAt: '2026-08-18T10:01:00.000Z' }),
            // Note: A firing planned message is already past its own due date, so it is not "ahead"
            createPlannedMessage({ lifecycle: 'ONGOING', dueAt: '2026-08-18T09:59:00.000Z' }),
            createPlannedMessage({ lifecycle: 'ENDED', dueAt: '2026-08-17T10:00:00.000Z' }),
        ]);

        expect(counters.totalCount).toBe(4);
        expect(counters.countByLifecycle).toEqual({
            ONGOING: 1,
            SCHEDULED: 1,
            NOT_STARTED: 1,
            PAUSED: 0,
            CANCELLED: 0,
            ENDED: 1,
            FAILED: 0,
        });
        expect(counters.nextDueAt).toBe('2026-08-18T10:01:00.000Z');
    });

    it('has no next wake-up when nothing is planned anymore', () => {
        expect(createPlannedMessageManagerCounters([createPlannedMessage({ lifecycle: 'CANCELLED' })]).nextDueAt).toBe(
            null,
        );
    });
});
