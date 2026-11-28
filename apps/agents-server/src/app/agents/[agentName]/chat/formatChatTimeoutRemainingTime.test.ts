import { describe, expect, it } from '@jest/globals';
import { formatChatTimeoutRemainingTime } from './formatChatTimeoutRemainingTime';

describe('formatChatTimeoutRemainingTime', () => {
    const currentTimestamp = new Date('2026-03-13T12:00:00.000Z').getTime();

    it('shows only minutes when more than three minutes remain', () => {
        expect(formatChatTimeoutRemainingTime('2026-03-13T12:49:44.000Z', currentTimestamp)).toBe('49m');
    });

    it('shows minutes and seconds when less than three minutes remain', () => {
        expect(formatChatTimeoutRemainingTime('2026-03-13T12:02:59.000Z', currentTimestamp)).toBe('2m 59s');
    });

    it('shows seconds only when less than one minute remains', () => {
        expect(formatChatTimeoutRemainingTime('2026-03-13T12:00:59.000Z', currentTimestamp)).toBe('59s');
    });

    it('shows hours and minutes for larger durations', () => {
        expect(formatChatTimeoutRemainingTime('2026-03-13T14:03:00.000Z', currentTimestamp)).toBe('2h 3m');
    });

    it('returns due-now label for elapsed timeouts', () => {
        expect(formatChatTimeoutRemainingTime('2026-03-13T11:59:59.000Z', currentTimestamp)).toBe('Due now');
    });
});
