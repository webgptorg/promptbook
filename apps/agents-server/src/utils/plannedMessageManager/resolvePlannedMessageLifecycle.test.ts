import { describe, expect, it } from '@jest/globals';
import { resolvePlannedMessageEndReason } from './resolvePlannedMessageEndReason';
import { resolvePlannedMessageLifecycle, type PlannedMessageLifecycleInput } from './resolvePlannedMessageLifecycle';
import { resolvePlannedMessageRecurrenceKind } from './resolvePlannedMessageRecurrenceKind';

/**
 * Moment every planned message in these tests is judged at.
 */
const NOW_DATE = new Date('2026-08-18T10:00:00.000Z');

/**
 * Creates one queued planned message without any bound.
 *
 * @param overrides - Fields specific to one test case.
 * @returns Stored fields deciding the stage of one planned message.
 */
function createPlannedMessage(overrides: Partial<PlannedMessageLifecycleInput> = {}): PlannedMessageLifecycleInput {
    return {
        status: 'QUEUED',
        pausedAt: null,
        cancelRequestedAt: null,
        startsAt: null,
        ...overrides,
    };
}

describe('resolvePlannedMessageLifecycle', () => {
    it('reports a queued planned message with its window open as scheduled', () => {
        expect(resolvePlannedMessageLifecycle(createPlannedMessage(), NOW_DATE)).toBe('SCHEDULED');
        expect(
            resolvePlannedMessageLifecycle(
                createPlannedMessage({ startsAt: '2026-08-18T09:00:00.000Z' }),
                NOW_DATE,
            ),
        ).toBe('SCHEDULED');
    });

    it('separates a planned message whose starting date is still ahead', () => {
        expect(
            resolvePlannedMessageLifecycle(
                createPlannedMessage({ startsAt: '2026-08-20T08:00:00.000Z' }),
                NOW_DATE,
            ),
        ).toBe('NOT_STARTED');
    });

    it('reports a firing planned message as ongoing, even while it waits for its starting date', () => {
        expect(resolvePlannedMessageLifecycle(createPlannedMessage({ status: 'RUNNING' }), NOW_DATE)).toBe('ONGOING');
        expect(
            resolvePlannedMessageLifecycle(
                createPlannedMessage({ status: 'RUNNING', startsAt: '2026-08-20T08:00:00.000Z' }),
                NOW_DATE,
            ),
        ).toBe('ONGOING');
    });

    it('reports a paused planned message as paused instead of scheduled', () => {
        expect(
            resolvePlannedMessageLifecycle(createPlannedMessage({ pausedAt: '2026-08-18T09:30:00.000Z' }), NOW_DATE),
        ).toBe('PAUSED');
    });

    it('reports a planned message as cancelled as soon as its cancellation is requested', () => {
        expect(
            resolvePlannedMessageLifecycle(
                createPlannedMessage({ cancelRequestedAt: '2026-08-18T09:59:00.000Z' }),
                NOW_DATE,
            ),
        ).toBe('CANCELLED');
        expect(resolvePlannedMessageLifecycle(createPlannedMessage({ status: 'CANCELLED' }), NOW_DATE)).toBe(
            'CANCELLED',
        );
    });

    it('reports a completed plan as ended and a failed one as failed', () => {
        expect(resolvePlannedMessageLifecycle(createPlannedMessage({ status: 'COMPLETED' }), NOW_DATE)).toBe('ENDED');
        expect(resolvePlannedMessageLifecycle(createPlannedMessage({ status: 'FAILED' }), NOW_DATE)).toBe('FAILED');
    });
});

describe('resolvePlannedMessageEndReason', () => {
    it('explains a plan that ran as many times as it was planned to run', () => {
        expect(
            resolvePlannedMessageEndReason(
                {
                    recurrenceIntervalMs: 300_000,
                    cronExpression: null,
                    endsAt: null,
                    maxRunCount: 10,
                    runCount: 10,
                },
                NOW_DATE,
            ),
        ).toBe('MAX_RUNS_REACHED');
    });

    it('explains a plan whose ending date passed', () => {
        expect(
            resolvePlannedMessageEndReason(
                {
                    recurrenceIntervalMs: 300_000,
                    cronExpression: null,
                    endsAt: '2026-08-17T10:00:00.000Z',
                    maxRunCount: null,
                    runCount: 4,
                },
                NOW_DATE,
            ),
        ).toBe('ENDING_DATE_PASSED');
    });

    it('explains a planned message that was only ever meant to wake the agent once', () => {
        expect(
            resolvePlannedMessageEndReason(
                { recurrenceIntervalMs: null, cronExpression: null, endsAt: null, maxRunCount: null, runCount: 1 },
                NOW_DATE,
            ),
        ).toBe('SINGLE_RUN_DONE');
    });

    it('leaves a repeating plan that is not over unexplained', () => {
        expect(
            resolvePlannedMessageEndReason(
                {
                    recurrenceIntervalMs: null,
                    cronExpression: '0 9 * * 1-5',
                    endsAt: '2026-08-20T10:00:00.000Z',
                    maxRunCount: 10,
                    runCount: 4,
                },
                NOW_DATE,
            ),
        ).toBeNull();
    });
});

describe('resolvePlannedMessageRecurrenceKind', () => {
    it('tells a cron, an interval, and a single wake-up apart', () => {
        expect(resolvePlannedMessageRecurrenceKind({ recurrenceIntervalMs: null, cronExpression: '0 9 * * *' })).toBe(
            'CRON',
        );
        expect(resolvePlannedMessageRecurrenceKind({ recurrenceIntervalMs: 300_000, cronExpression: null })).toBe(
            'INTERVAL',
        );
        expect(resolvePlannedMessageRecurrenceKind({ recurrenceIntervalMs: null, cronExpression: null })).toBe('ONCE');
    });
});
