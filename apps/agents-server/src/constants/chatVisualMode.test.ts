import { describe, expect, it } from '@jest/globals';
import { CHAT_VISUAL_MODES, resolveChatVisualMode } from './chatVisualMode';

describe('chat visual mode constants', () => {
    it('resolves explicit ARTICLE_MODE', () => {
        expect(resolveChatVisualMode(CHAT_VISUAL_MODES.ARTICLE_MODE)).toBe(CHAT_VISUAL_MODES.ARTICLE_MODE);
    });

    it('falls back to BUBBLE_MODE for unknown values', () => {
        expect(resolveChatVisualMode('unknown')).toBe(CHAT_VISUAL_MODES.BUBBLE_MODE);
        expect(resolveChatVisualMode(null)).toBe(CHAT_VISUAL_MODES.BUBBLE_MODE);
    });
});
