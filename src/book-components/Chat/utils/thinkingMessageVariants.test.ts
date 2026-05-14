import { describe, expect, it } from '@jest/globals';
import { DEFAULT_THINKING_MESSAGES } from '../../../utils/DEFAULT_THINKING_MESSAGES';
import {
    getRandomThinkingMessageDelayMs,
    getRandomThinkingMessageVariant,
    normalizeThinkingMessageVariants,
} from './thinkingMessageVariants';

describe('thinkingMessageVariants', () => {
    it('falls back to shared defaults when variants are missing', () => {
        expect(normalizeThinkingMessageVariants(undefined)).toEqual(DEFAULT_THINKING_MESSAGES);
    });

    it('removes blank configured variants', () => {
        expect(normalizeThinkingMessageVariants([' Thinking... ', '', '   ', 'Searching...'])).toEqual([
            'Thinking...',
            'Searching...',
        ]);
    });

    it('avoids repeating the excluded variant when an alternative exists', () => {
        expect(getRandomThinkingMessageVariant(['Thinking...', 'Searching...'], 'Thinking...')).toBe('Searching...');
    });

    it('returns delays inside the configured bounds', () => {
        const delay = getRandomThinkingMessageDelayMs();

        expect(delay).toBeGreaterThanOrEqual(1_000);
        expect(delay).toBeLessThanOrEqual(5_000);
    });
});
