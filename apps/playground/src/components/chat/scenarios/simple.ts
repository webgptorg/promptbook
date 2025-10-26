import type { ChatMessage } from '../../../../../../src/playground/Chat/types/ChatMessage';

export const simpleScenario = {
    name: 'Simple Chat',
    messages: [
        {
            id: '1',
            date: new Date(),
            from: 'USER',
            content: 'Hello! How can you help me today?',
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            from: 'ASSISTANT_1',
            content:
                "Hi there! I'm here to help you with any questions or tasks you have. What would you like to work on?",
            isComplete: true,
        },
        {
            id: '3',
            date: new Date(),
            from: 'USER',
            content: 'Can you help me understand React components?',
            isComplete: true,
        },
        {
            id: '4',
            date: new Date(),
            from: 'ASSISTANT_1',
            content:
                "Absolutely! React components are the building blocks of React applications. They're reusable pieces of code that return JSX...",
            isComplete: true,
        },
    ] as ChatMessage[],
};
