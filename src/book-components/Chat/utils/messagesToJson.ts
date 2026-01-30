import type { ChatMessage } from '../types/ChatMessage';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';

/**
 * Converts chat messages to JSON format
 *
 * @private utility of `<Chat/>` component
 */
export function messagesToJson(messages: ChatMessage[], shareUrl: string): string {
    const exportData = {
        metadata: {
            exportedBy: 'Promptbook Studio',
            exportedAt: new Date().toISOString(),
            website: 'https://promptbook.studio',
            messageCount: messages.length,
            shareUrl,
        },
        messages: messages.map((message, index) => {
            const createdAtValue = (message as { createdAt?: string | Date }).createdAt;
            const createdAt =
                createdAtValue instanceof Date ? createdAtValue.toISOString() : createdAtValue || $getCurrentDate();

            return {
                id: message.id || `msg_${index}`,
                sender: message.sender,
                content: message.content,
                isComplete: message.isComplete ?? true,
                createdAt,
            };
        }),
    };

    return JSON.stringify(exportData, null, 2);
}
