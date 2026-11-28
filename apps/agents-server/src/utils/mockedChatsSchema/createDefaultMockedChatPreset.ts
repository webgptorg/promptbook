import type { MockedChatPreset } from './MockedChatPreset';
import { createMockedChatId, createMockedChatMessageId } from './createMockedChatId';

/**
 * Creates a default mocked-chat preset used by the editor when no data exists.
 */
export function createDefaultMockedChatPreset(): MockedChatPreset {
    const nowIso = new Date().toISOString();
    const userId = 'USER';
    const assistantId = 'ASSISTANT';

    return {
        id: createMockedChatId(),
        name: 'My mocked chat',
        createdAt: nowIso,
        updatedAt: nowIso,
        participants: [
            {
                id: userId,
                name: 'You',
                isMe: true,
                bubbleColor: '#0f766e',
                avatarUrl: null,
                typingAvatarUrl: null,
            },
            {
                id: assistantId,
                name: 'Assistant',
                isMe: false,
                bubbleColor: '#2563eb',
                avatarUrl: null,
                typingAvatarUrl: null,
            },
        ],
        messages: [
            {
                id: createMockedChatMessageId(),
                senderId: userId,
                content: 'Can you summarize this project status for stakeholders?',
                offsetMs: 0,
            },
            {
                id: createMockedChatMessageId(),
                senderId: assistantId,
                content: 'Absolutely. I can draft a short executive summary and a technical appendix.',
                offsetMs: 1_200,
            },
            {
                id: createMockedChatMessageId(),
                senderId: userId,
                content: 'Great, keep it concise and focused on risks and next milestones.',
                offsetMs: 3_200,
            },
            {
                id: createMockedChatMessageId(),
                senderId: assistantId,
                content:
                    'Understood. I will highlight delivery risk, mitigation plan, and upcoming release checkpoints.',
                offsetMs: 5_000,
            },
        ],
        settings: {
            timingPreset: 'NORMAL',
            loopPlayback: false,
            viewportPreset: 'LAPTOP',
            showTimestamps: true,
            backgroundColor: '#f8fafc',
            backgroundImageUrl: null,
        },
    };
}
