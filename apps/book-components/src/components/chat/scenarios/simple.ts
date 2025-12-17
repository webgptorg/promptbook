import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const simpleScenario = {
    name: 'Simple Chat',
    messages: [
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '1',
            createdAt: new Date(),
            sender: 'USER',
            content: 'Hello! How can you help me today?',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '2',
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content:
                "Hi there! I'm here to help you with any questions or tasks you have. What would you like to work on?",
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '3',
            createdAt: new Date(),
            sender: 'USER',
            content: 'Can you help me understand React components?',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '4',
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content:
                "Absolutely! React components are the building blocks of React applications. They're reusable pieces of code that return JSX...",
            isComplete: true,
        },
    ] satisfies Array<ChatMessage>,
};
