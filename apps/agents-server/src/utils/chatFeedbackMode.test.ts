import { describe, expect, it } from '@jest/globals';
import { DEFAULT_CHAT_FEEDBACK_MODE, isChatFeedbackEnabled, parseChatFeedbackMode } from './chatFeedbackMode';

describe('chat feedback mode', () => {
    it('defaults to disabled feedback when metadata is missing or invalid', () => {
        expect(DEFAULT_CHAT_FEEDBACK_MODE).toBe('off');
        expect(parseChatFeedbackMode(null, null)).toBe(DEFAULT_CHAT_FEEDBACK_MODE);
        expect(parseChatFeedbackMode('unsupported', undefined)).toBe(DEFAULT_CHAT_FEEDBACK_MODE);
        expect(isChatFeedbackEnabled(DEFAULT_CHAT_FEEDBACK_MODE)).toBe(false);
    });

    it('keeps legacy feedback metadata compatibility when the new mode is missing', () => {
        expect(parseChatFeedbackMode(undefined, 'true')).toBe('stars');
        expect(parseChatFeedbackMode(undefined, 'false')).toBe('off');
    });

    it('prefers the explicit chat feedback mode over the legacy toggle', () => {
        expect(parseChatFeedbackMode('report_issue', 'false')).toBe('report_issue');
        expect(parseChatFeedbackMode('off', 'true')).toBe('off');
    });
});
