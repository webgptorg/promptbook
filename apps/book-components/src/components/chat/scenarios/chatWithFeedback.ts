import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const chatWithFeedbackScenario = {
    name: 'Chat with feedback',
    messages: [
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '1',
            createdAt: new Date(),
            sender: 'USER',
            content: 'Hello! Can you help me?',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '2',
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content: 'Of course! What do you need help with?',
            isComplete: true,
        },
    ] satisfies Array<ChatMessage>,
};
