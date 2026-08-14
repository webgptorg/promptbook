import { describe, expect, it } from '@jest/globals';
import type { ChatMessage } from '@promptbook-local/types';
import { resolveLatestCompletedAgentMessageKey } from './resolveLatestCompletedAgentMessageKey';

describe('resolveLatestCompletedAgentMessageKey', () => {
    it('reports no key while the agent has answered nothing', () => {
        expect(resolveLatestCompletedAgentMessageKey(undefined)).toBeNull();
        expect(resolveLatestCompletedAgentMessageKey([])).toBeNull();
        expect(
            resolveLatestCompletedAgentMessageKey([
                { id: 'message-1', sender: 'USER', content: 'Make me a project' },
            ] as unknown as ReadonlyArray<ChatMessage>),
        ).toBeNull();
    });

    it('ignores the answer which is still being generated', () => {
        const messages = [
            { id: 'message-1', sender: 'AGENT', content: 'Done', isComplete: true },
            { id: 'message-2', sender: 'USER', content: 'And one more' },
            { id: 'message-3', sender: 'AGENT', content: 'Working…', isComplete: false },
        ] as unknown as ReadonlyArray<ChatMessage>;

        expect(resolveLatestCompletedAgentMessageKey(messages)).toBe('message-1');
    });

    it('moves to the newest answer once it is finished', () => {
        const messages = [
            { id: 'message-1', sender: 'AGENT', content: 'Done', isComplete: true },
            { id: 'message-2', sender: 'USER', content: 'And one more' },
            { id: 'message-3', sender: 'AGENT', content: 'Done again', isComplete: true },
        ] as unknown as ReadonlyArray<ChatMessage>;

        expect(resolveLatestCompletedAgentMessageKey(messages)).toBe('message-3');
    });

    it('identifies answers without an id by their position', () => {
        const messages = [
            { sender: 'USER', content: 'Make me a project' },
            { sender: 'AGENT', content: 'Done' },
        ] as unknown as ReadonlyArray<ChatMessage>;

        expect(resolveLatestCompletedAgentMessageKey(messages)).toBe('#1');
    });
});
