import { describe, expect, it } from '@jest/globals';
import type { PlannedMessageSchedule } from './PlannedMessageSchedule';
import { isPlannedMessageScheduleFinished } from './isPlannedMessageScheduleFinished';
import { resolvePlannedMessageDueAt } from './resolvePlannedMessageDueAt';

/**
 * Moment every planned-message schedule in these tests is resolved from.
 */
const NOW_DATE = new Date('2026-08-18T10:00:00.000Z');

/**
 * Creates one schedule without any recurrence or bound.
 *
 * @param scheduleOverrides - Fields specific to one test case.
 * @returns Recurrence rule of one planned message.
 */
function createSchedule(scheduleOverrides: Partial<PlannedMessageSchedule> = {}): PlannedMessageSchedule {
    return {
        cronExpression: null,
        recurrenceIntervalMs: null,
        startsAt: null,
        endsAt: null,
        maxRunCount: null,
        ...scheduleOverrides,
    };
}

describe('resolvePlannedMessageDueAt', () => {
    it('repeats one interval schedule from the moment it is resolved', () => {
        const dueAtDate = resolvePlannedMessageDueAt({
            schedule: createSchedule({ recurrenceIntervalMs: 300_000 }),
            completedRunCount: 3,
            afterDate: NOW_DATE,
        });

        expect(dueAtDate?.toISOString()).toBe('2026-08-18T10:05:00.000Z');
    });

    it('wakes an interval schedule with a starting date for the first time exactly then', () => {
        const schedule = createSchedule({ recurrenceIntervalMs: 300_000, startsAt: '2026-08-20T08:00:00.000Z' });

        expect(resolvePlannedMessageDueAt({ schedule, completedRunCount: 0, afterDate: NOW_DATE })?.toISOString()).toBe(
            '2026-08-20T08:00:00.000Z',
        );
        // Note: Once it started, the very same schedule simply keeps its interval
        expect(
            resolvePlannedMessageDueAt({
                schedule,
                completedRunCount: 1,
                afterDate: new Date('2026-08-20T08:00:00.000Z'),
            })?.toISOString(),
        ).toBe('2026-08-20T08:05:00.000Z');
    });

    it('finishes one planned message that ran as many times as it was planned to run', () => {
        const schedule = createSchedule({ recurrenceIntervalMs: 300_000, maxRunCount: 3 });

        expect(resolvePlannedMessageDueAt({ schedule, completedRunCount: 2, afterDate: NOW_DATE })).not.toBeNull();
        expect(resolvePlannedMessageDueAt({ schedule, completedRunCount: 3, afterDate: NOW_DATE })).toBeNull();
    });

    it('finishes one planned message whose next wake-up would be after its ending date', () => {
        const schedule = createSchedule({ recurrenceIntervalMs: 300_000, endsAt: '2026-08-18T10:03:00.000Z' });

        expect(resolvePlannedMessageDueAt({ schedule, completedRunCount: 1, afterDate: NOW_DATE })).toBeNull();
    });

    it('follows a cron expression inside its date window', () => {
        const schedule = createSchedule({
            cronExpression: '0 9 * * *',
            startsAt: '2026-08-20T00:00:00.000Z',
            endsAt: '2026-08-30T00:00:00.000Z',
        });
        const dueAtDate = resolvePlannedMessageDueAt({ schedule, completedRunCount: 0, afterDate: NOW_DATE });

        expect(dueAtDate).not.toBeNull();
        expect(dueAtDate!.getTime()).toBeGreaterThanOrEqual(Date.parse('2026-08-20T00:00:00.000Z'));
        expect(dueAtDate!.getHours()).toBe(9);
        expect(dueAtDate!.getMinutes()).toBe(0);
    });

    it('wakes one message without any recurrence only once, at the fallback delay', () => {
        const schedule = createSchedule();

        expect(
            resolvePlannedMessageDueAt({
                schedule,
                completedRunCount: 0,
                afterDate: NOW_DATE,
                fallbackDelayMs: 60_000,
            })?.toISOString(),
        ).toBe('2026-08-18T10:01:00.000Z');
        expect(
            resolvePlannedMessageDueAt({
                schedule,
                completedRunCount: 1,
                afterDate: NOW_DATE,
                fallbackDelayMs: 60_000,
            }),
        ).toBeNull();
    });

    it('holds back a running plan whose starting date was moved into the future', () => {
        const dueAtDate = resolvePlannedMessageDueAt({
            schedule: createSchedule({ recurrenceIntervalMs: 300_000, startsAt: '2026-09-01T08:00:00.000Z' }),
            completedRunCount: 4,
            afterDate: NOW_DATE,
        });

        expect(dueAtDate?.toISOString()).toBe('2026-09-01T08:00:00.000Z');
    });

    it('wakes one message with only a starting date exactly at that date', () => {
        const dueAtDate = resolvePlannedMessageDueAt({
            schedule: createSchedule({ startsAt: '2026-08-19T07:30:00.000Z' }),
            completedRunCount: 0,
            afterDate: NOW_DATE,
        });

        expect(dueAtDate?.toISOString()).toBe('2026-08-19T07:30:00.000Z');
    });
});

describe('isPlannedMessageScheduleFinished', () => {
    it('reports a schedule as finished once its runs or its window are over', () => {
        expect(
            isPlannedMessageScheduleFinished({
                schedule: createSchedule({ maxRunCount: 2 }),
                completedRunCount: 2,
                atDate: NOW_DATE,
            }),
        ).toBe(true);
        expect(
            isPlannedMessageScheduleFinished({
                schedule: createSchedule({ endsAt: '2026-08-18T09:59:00.000Z' }),
                completedRunCount: 0,
                atDate: NOW_DATE,
            }),
        ).toBe(true);
        expect(
            isPlannedMessageScheduleFinished({
                schedule: createSchedule({ endsAt: '2026-08-18T10:01:00.000Z', maxRunCount: 5 }),
                completedRunCount: 1,
                atDate: NOW_DATE,
            }),
        ).toBe(false);
    });
});
