import { describe, expect, it } from '@jest/globals';
import { buildTimeoutToolCallChipLabel, buildTimeoutToolPrimarySentence, buildTimeoutToolScheduleSentence, resolveTimeoutToolCallPresentation } from './timeoutToolCallPresentation';

describe('timeoutToolCallPresentation', () => {
    it('formats a friendly chip label for set_timeout based on milliseconds', () => {
        const presentation = resolveTimeoutToolCallPresentation({
            toolCallName: 'set_timeout',
            args: { milliseconds: 5_000 },
            resultRaw: {
                action: 'set',
                status: 'set',
                timeoutId: 'tmo_123',
                dueAt: '2026-03-21T14:05:00.000Z',
            },
            currentDate: new Date('2026-03-21T14:00:00.000Z'),
        });

        expect(presentation).not.toBeNull();
        const expectedLocalTime = new Intl.DateTimeFormat(undefined, {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date('2026-03-21T14:05:00.000Z'));
        expect(buildTimeoutToolCallChipLabel(presentation!)).toBe(`Timeout: ${expectedLocalTime}`);
        expect(buildTimeoutToolPrimarySentence(presentation!)).toBe(`Scheduled for ${expectedLocalTime}.`);
        expect(buildTimeoutToolScheduleSentence(presentation!)).toBe('Will retry in 5 seconds.');
    });

    it('formats cancel_timeout with non-technical chip text', () => {
        const presentation = resolveTimeoutToolCallPresentation({
            toolCallName: 'cancel_timeout',
            args: { timeoutId: 'tmo_456' },
            resultRaw: {
                action: 'cancel',
                status: 'cancelled',
                timeoutId: 'tmo_456',
            },
            currentDate: new Date('2026-03-21T14:00:00.000Z'),
        });

        expect(presentation).not.toBeNull();
        expect(buildTimeoutToolCallChipLabel(presentation!)).toBe('Timeout cancelled');
        expect(buildTimeoutToolPrimarySentence(presentation!)).toBe('The timeout has been cancelled.');
        expect(buildTimeoutToolScheduleSentence(presentation!)).toBeNull();
    });

    it('returns null for non-timeout tools', () => {
        const presentation = resolveTimeoutToolCallPresentation({
            toolCallName: 'web_search',
            args: {},
            resultRaw: {},
            currentDate: new Date('2026-03-21T14:00:00.000Z'),
        });

        expect(presentation).toBeNull();
    });

    it('formats localized timeout chip text from translation templates', () => {
        const presentation = resolveTimeoutToolCallPresentation({
            toolCallName: 'set_timeout',
            args: { milliseconds: 5_000 },
            resultRaw: {
                action: 'set',
                status: 'set',
                timeoutId: 'tmo_123',
                dueAt: '2026-03-21T14:05:00.000Z',
            },
            currentDate: new Date('2026-03-21T14:00:00.000Z'),
            locale: 'cs',
        });

        expect(presentation).not.toBeNull();
        expect(buildTimeoutToolCallChipLabel(presentation!, { toolCallTimeoutChipLabel: 'Timer: {time}' })).toMatch(
            /^Timer: .+/,
        );
    });

    it('falls back to tool arguments when the timeout result payload is not an object', () => {
        const presentation = resolveTimeoutToolCallPresentation({
            toolCallName: 'set_timeout',
            args: {
                milliseconds: '65000',
                dueAt: '2026-03-21T14:01:05.000Z',
                message: '  Retry later  ',
            },
            resultRaw: 'scheduled',
            currentDate: new Date('2026-03-21T14:00:00.000Z'),
        });

        expect(presentation).toEqual(
            expect.objectContaining({
                action: 'set',
                status: null,
                milliseconds: 65_000,
                message: 'Retry later',
                dueAtIsoUtc: '2026-03-21T14:01:05.000Z',
                compactDurationLabel: '1m 5s',
                humanDurationLabel: '1 minute',
            }),
        );
    });
});
