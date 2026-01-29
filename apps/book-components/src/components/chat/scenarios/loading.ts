import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const loadingScenario = {
    name: 'Loading Message',
    messages: [
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '1',
            createdAt: new Date(),
            sender: 'USER',
            content: "What's the weather like today?",
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '2',
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content: 'Let me check the current weather conditions for you...',
            isComplete: false,
        },
    ] satisfies Array<ChatMessage>,
};
