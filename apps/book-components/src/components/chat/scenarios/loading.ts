import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const loadingScenario = {
    name: 'Loading Message',
    messages: [
        {
            id: '1',
            date: new Date(),
            sender: 'USER',
            content: "What's the weather like today?",
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            sender: 'ASSISTANT_1',
            content: 'Let me check the current weather conditions for you...',
            isComplete: false,
        },
    ] as ChatMessage[],
};
