import { describe, expect, it } from '@jest/globals';
import {
    createChatHistoryThreadTitle,
    groupChatHistoryThreads,
    resolveChatHistoryMessageSender,
    resolveChatHistoryMessageText,
    type ChatHistoryThreadSourceRow,
} from './chatHistoryMessage';

describe('resolveChatHistoryMessageSender', () => {
    it('maps user roles to USER and everything else to ASSISTANT', () => {
        expect(resolveChatHistoryMessageSender({ role: 'USER' })).toBe('USER');
        expect(resolveChatHistoryMessageSender({ role: 'user' })).toBe('USER');
        expect(resolveChatHistoryMessageSender({ role: 'MODEL' })).toBe('ASSISTANT');
        expect(resolveChatHistoryMessageSender('raw string')).toBe('USER');
    });
});

describe('resolveChatHistoryMessageText', () => {
    it('extracts textual content from various message shapes', () => {
        expect(resolveChatHistoryMessageText('hello')).toBe('hello');
        expect(resolveChatHistoryMessageText({ content: 'hi there' })).toBe('hi there');
        expect(resolveChatHistoryMessageText({ text: 'from text' })).toBe('from text');
        expect(resolveChatHistoryMessageText({ content: ['a', 'b'] })).toBe('a b');
        expect(resolveChatHistoryMessageText(null)).toBe('');
    });
});

describe('createChatHistoryThreadTitle', () => {
    it('collapses whitespace and limits the length', () => {
        expect(createChatHistoryThreadTitle('  a\n\n  b  ')).toBe('a b');
        expect(createChatHistoryThreadTitle('')).toBe('Untitled chat');
        expect(createChatHistoryThreadTitle('x'.repeat(200))).toHaveLength(81); // 80 chars + ellipsis
    });
});

describe('groupChatHistoryThreads', () => {
    const rows: ReadonlyArray<ChatHistoryThreadSourceRow> = [
        { id: 1, createdAt: '2026-07-10T10:00:00.000Z', agentName: 'a', chatId: 'chat-1', message: { role: 'USER', content: 'First question' } },
        { id: 2, createdAt: '2026-07-10T10:01:00.000Z', agentName: 'a', chatId: 'chat-1', message: { role: 'MODEL', content: 'Answer' } },
        { id: 3, createdAt: '2026-07-11T09:00:00.000Z', agentName: 'b', chatId: 'chat-2', message: { role: 'USER', content: 'Second thread' } },
        { id: 4, createdAt: '2026-07-09T09:00:00.000Z', agentName: 'a', chatId: null, message: { role: 'USER', content: 'Legacy unthreaded' } },
    ];

    it('groups rows by chatId and ignores unthreaded rows', () => {
        const threads = groupChatHistoryThreads(rows);
        expect(threads).toHaveLength(2);
        expect(threads.map((thread) => thread.chatId)).toEqual(['chat-2', 'chat-1']); // sorted by last activity desc
    });

    it('derives counts, timestamps and a title from the first user message', () => {
        const threads = groupChatHistoryThreads(rows);
        const firstThread = threads.find((thread) => thread.chatId === 'chat-1')!;
        expect(firstThread.messageCount).toBe(2);
        expect(firstThread.agentName).toBe('a');
        expect(firstThread.title).toBe('First question');
        expect(firstThread.firstMessageAt).toBe('2026-07-10T10:00:00.000Z');
        expect(firstThread.lastMessageAt).toBe('2026-07-10T10:01:00.000Z');
    });
});
