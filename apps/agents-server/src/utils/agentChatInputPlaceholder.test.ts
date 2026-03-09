import { describe, expect, it } from '@jest/globals';
import {
    DEFAULT_AGENT_CHAT_INPUT_PLACEHOLDER,
    resolveAgentChatInputPlaceholder,
} from './agentChatInputPlaceholder';

describe('resolveAgentChatInputPlaceholder', () => {
    it('returns default when value is undefined', () => {
        expect(resolveAgentChatInputPlaceholder(undefined)).toBe(DEFAULT_AGENT_CHAT_INPUT_PLACEHOLDER);
    });

    it('returns default when value is whitespace only', () => {
        expect(resolveAgentChatInputPlaceholder('   ')).toBe(DEFAULT_AGENT_CHAT_INPUT_PLACEHOLDER);
    });

    it('returns trimmed custom value when provided', () => {
        expect(resolveAgentChatInputPlaceholder('  Ask me anything...  ')).toBe('Ask me anything...');
    });
});
