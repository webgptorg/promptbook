import { describe, expect, it } from '@jest/globals';
import { DEFAULT_THINKING_MESSAGES, parseThinkingMessages, resolveThinkingMessages } from './thinkingMessages';

describe('thinkingMessages', () => {
    it('parses slash-separated server metadata with default fallback', () => {
        expect(parseThinkingMessages(' Thinking... / Processing... /  ')).toEqual(['Thinking...', 'Processing...']);
        expect(parseThinkingMessages('   ')).toEqual(DEFAULT_THINKING_MESSAGES);
    });

    it('prefers agent thinking messages over server metadata', () => {
        expect(resolveThinkingMessages([' Working... ', '', ' Done soon... '], ['Server thinking...'])).toEqual([
            'Working...',
            'Done soon...',
        ]);
    });

    it('uses server thinking messages when the agent has no non-empty variants', () => {
        expect(resolveThinkingMessages([' ', ''], ['Server thinking...'])).toEqual(['Server thinking...']);
    });
});
