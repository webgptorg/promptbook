import { describe, expect, it } from '@jest/globals';
import { parsePlannedMessageSchedule } from './parsePlannedMessageSchedule';

describe('parsePlannedMessageSchedule', () => {
    it('accepts one bounded cron schedule', () => {
        expect(
            parsePlannedMessageSchedule({
                cronExpression: ' 0   9 * * 1-5 ',
                maxRunCount: 10,
                startsAt: '2026-09-01T08:00:00.000Z',
                endsAt: '2026-09-30T08:00:00.000Z',
            }),
        ).toEqual({
            cronExpression: '0 9 * * 1-5',
            recurrenceIntervalMs: null,
            maxRunCount: 10,
            startsAt: '2026-09-01T08:00:00.000Z',
            endsAt: '2026-09-30T08:00:00.000Z',
        });
    });

    it('accepts one repeating interval schedule', () => {
        expect(parsePlannedMessageSchedule({ milliseconds: 300_000.7 })).toEqual({
            cronExpression: null,
            recurrenceIntervalMs: 300_000,
            maxRunCount: null,
            startsAt: null,
            endsAt: null,
        });
    });

    it('rejects a schedule which uses both a cron and an interval', () => {
        expect(() => parsePlannedMessageSchedule({ cronExpression: '0 9 * * *', milliseconds: 60_000 })).toThrow(
            'not both',
        );
    });

    it('rejects an interval below one minute', () => {
        expect(() => parsePlannedMessageSchedule({ milliseconds: 1_000 })).toThrow('`milliseconds`');
    });

    it('rejects an invalid cron expression', () => {
        expect(() => parsePlannedMessageSchedule({ cronExpression: '0 9 *' })).toThrow('Use exactly five fields');
        expect(() => parsePlannedMessageSchedule({ cronExpression: '99 9 * * *' })).toThrow('minute');
    });

    it('rejects a run count which is not a whole positive number', () => {
        expect(() => parsePlannedMessageSchedule({ milliseconds: 60_000, maxRunCount: 0 })).toThrow('`maxRunCount`');
        expect(() => parsePlannedMessageSchedule({ milliseconds: 60_000, maxRunCount: 2.5 })).toThrow('`maxRunCount`');
    });

    it('rejects a window which ends before it starts', () => {
        expect(() =>
            parsePlannedMessageSchedule({
                milliseconds: 60_000,
                startsAt: '2026-09-10T08:00:00.000Z',
                endsAt: '2026-09-01T08:00:00.000Z',
            }),
        ).toThrow('after');
    });

    it('rejects a schedule which never says when it wakes the agent', () => {
        expect(() => parsePlannedMessageSchedule({ maxRunCount: 3 })).toThrow('`startsAt`');
    });
});
