import type { ChatMessage } from '../../../../../../src/playground/Chat/types/ChatMessage';

export const multiParticipantScenario = {
    name: 'Chat with multiple AI Avatars',
    messages: [
        {
            id: '1',
            date: new Date(),
            from: 'USER',
            content: 'I need help with both coding and writing. Can you both assist?',
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            from: 'ASSISTANT_2',
            content: "I'll help with the coding aspects! What programming language are you working with?",
            isComplete: true,
        },
        {
            id: '3',
            date: new Date(),
            from: 'ASSISTANT_3',
            content: 'And I can assist with any writing tasks you have. Documentation, content creation, etc.',
            isComplete: true,
        },
        {
            id: '4',
            date: new Date(),
            from: 'USER',
            content:
                "Perfect! I'm working on a JavaScript project and need to write some technical documentation for it.",
            isComplete: true,
        },
        {
            id: '5',
            date: new Date(),
            from: 'ASSISTANT_2',
            content:
                'Great! For JavaScript, I recommend starting with clear function and class documentation using JSDoc comments...',
            isComplete: true,
        },
    ] as ChatMessage[],
};
