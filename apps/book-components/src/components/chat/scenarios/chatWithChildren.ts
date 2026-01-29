import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const chatWithChildrenScenario = {
    name: 'Chat with children',
    messages: [
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '1',
            createdAt: new Date(),
            sender: 'USER',
            content: 'What is the meaning of life?',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '2',
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content: "That's a deep question! The meaning of life is often considered to be 42.",
            isComplete: true,
        },
    ] satisfies Array<ChatMessage>,
};
