import { describe, expect, it } from '@jest/globals';
import {
    buildTimeoutToolCallChipLabel,
    buildTimeoutToolPrimarySentence,
    buildTimeoutToolScheduleSentence,
    resolveTimeoutToolCallPresentation,
} from './timeoutToolCallPresentation';

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
        expect(buildTimeoutToolCallChipLabel(presentation!)).toBe('Timeout: 5s');
        expect(buildTimeoutToolPrimarySentence(presentation!)).toBe('Will retry in 5 seconds.');
        expect(buildTimeoutToolScheduleSentence(presentation!)).toContain('Scheduled for');
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
});
