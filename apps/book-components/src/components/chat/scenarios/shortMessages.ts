import { $getCurrentDate } from '../../../../../../src/utils/misc/$getCurrentDate';
import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

/**
 * @private @@@
 */
export const shortMessagesScenario = {
    name: 'Short Messages',
    messages: [
        {
            id: '1',
            createdAt: $getCurrentDate(),
            sender: 'USER',
            content: 'Hi',
            isComplete: true,
        },
        {
            id: '2',
            createdAt: $getCurrentDate(),
            sender: 'ASSISTANT_1',
            content: 'Hello',
            isComplete: true,
        },
        {
            id: '3',
            createdAt: $getCurrentDate(),
            sender: 'USER',
            content: 'Yes',
            isComplete: true,
        },
        {
            id: '4',
            createdAt: $getCurrentDate(),
            sender: 'ASSISTANT_1',
            content: 'OK',
            isComplete: true,
        },
    ] satisfies Array<ChatMessage>,
};
