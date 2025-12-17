import { spaceTrim } from '@promptbook-local/utils';
import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const chatButtonsScenario = {
    name: 'Chat with Buttons',
    messages: [
        {
            channel: 'PROMPTBOOK_CHAT',
            id: '1',
            createdAt: new Date('2025-01-01T10:00:00Z'),
            sender: 'USER',
            content: 'Hi there! Can you help me get started?',
            isComplete: true,
        },
        {
            channel: 'PROMPTBOOK_CHAT',
            id: '2',
            createdAt: new Date('2025-01-01T10:00:30Z'),
            sender: 'ASSISTANT_1',
            content: spaceTrim(`
                    Hello! I'd be happy to help you get started. Here are some quick options to get you going:

                    [Say Hello](?message=Hello!)
                    [Ask for help](?message=I need help with my project)
                    [Just say thanks](?message=Thanks for your assistance!)
                    [Learn more](?message=Tell me more about your capabilities)
                `),
            isComplete: true,
        },
    ] satisfies Array<ChatMessage>,
};

/**
 * TODO: !!! Chat buttons colors
 */
