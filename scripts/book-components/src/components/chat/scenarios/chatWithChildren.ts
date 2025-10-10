import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const chatWithChildrenScenario = {
    name: 'Chat with children',
    messages: [
        {
            id: '1',
            date: new Date(),
            from: 'USER',
            content: 'What is the meaning of life?',
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            from: 'ASSISTANT_1',
            content: "That's a deep question! The meaning of life is often considered to be 42.",
            isComplete: true,
        },
    ] as ChatMessage[],
};
