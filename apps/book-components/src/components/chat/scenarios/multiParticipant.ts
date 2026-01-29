import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const multiParticipantScenario = {
    name: 'Chat with multiple AI Avatars',
    messages: [
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '1',
            createdAt: new Date(),
            sender: 'USER',
            content: 'I need help with both coding and writing. Can you both assist?',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '2',
            createdAt: new Date(),
            sender: 'ASSISTANT_2',
            content: "I'll help with the coding aspects! What programming language are you working with?",
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '3',
            createdAt: new Date(),
            sender: 'ASSISTANT_3',
            content: 'And I can assist with any writing tasks you have. Documentation, content creation, etc.',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '4',
            createdAt: new Date(),
            sender: 'USER',
            content:
                "Perfect! I'm working on a JavaScript project and need to write some technical documentation for it.",
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '5',
            createdAt: new Date(),
            sender: 'ASSISTANT_2',
            content:
                'Great! For JavaScript, I recommend starting with clear function and class documentation using JSDoc comments...',
            isComplete: true,
        },
    ] satisfies Array<ChatMessage>,
};
