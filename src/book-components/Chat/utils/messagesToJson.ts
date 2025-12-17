import type { ChatMessage } from '../types/ChatMessage';

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
        messages: messages.map((message, index) => ({
            id: message.id || `msg_${index}`,
            sender: message.sender,
            content: message.content,
            isComplete: message.isComplete ?? true,
            createdAt: new Date().toISOString(), // Note: Real timestamp would come from message data
        })),
    };

    return JSON.stringify(exportData, null, 2);
}
