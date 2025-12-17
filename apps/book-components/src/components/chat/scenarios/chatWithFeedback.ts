import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const chatWithFeedbackScenario = {
    name: 'Chat with feedback',
    messages: [
        {
            id: '1',
            date: new Date(),
            sender: 'USER',
            content: 'Hello! Can you help me?',
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            sender: 'ASSISTANT_1',
            content: 'Of course! What do you need help with?',
            isComplete: true,
        },
    ] as ChatMessage[],
};
