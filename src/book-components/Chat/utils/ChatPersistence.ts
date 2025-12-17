import { string_date_iso8601 } from '../../../types/typeAliases';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Serializable version of ChatMessage for localStorage
 * Date objects need to be converted to strings for JSON serialization
 */
type SerializableChatMessage = Omit<ChatMessage, 'createdAt'> & {
    createdAt: string_date_iso8601;
};

/**
 * Utility functions for persisting chat conversations in localStorage
 *
 * @private util of `LlmChat`
 */
export class ChatPersistence {
    private static readonly STORAGE_PREFIX = 'promptbook_chat_';

    /**
     * Save messages to localStorage under the given key
     */
    static saveMessages(persistenceKey: string, messages: ReadonlyArray<ChatMessage>): void {
        try {
            const serializableMessages: SerializableChatMessage[] = messages.map((message) => ({
                ...message,
                createdAt: (typeof message.createdAt === 'string'
                    ? new Date(message.createdAt)
                    : message.createdAt || new Date()
                ).toISOString() as string_date_iso8601,
            }));

            const storageKey = this.STORAGE_PREFIX + persistenceKey;
            localStorage.setItem(storageKey, JSON.stringify(serializableMessages));
        } catch (error) {
            console.warn('Failed to save chat messages to localStorage:', error);
        }
    }

    /**
     * Load messages from localStorage for the given key
     */
    static loadMessages(persistenceKey: string): ChatMessage[] {
        try {
            const storageKey = this.STORAGE_PREFIX + persistenceKey;
            const stored = localStorage.getItem(storageKey);

            if (!stored) {
                return [];
            }

            const serializableMessages: SerializableChatMessage[] = JSON.parse(stored);

            // Convert date strings back to Date objects
            return serializableMessages.map((message) => ({
                ...message,
                createdAt: new Date(message.createdAt),
            }));
        } catch (error) {
            console.warn('Failed to load chat messages from localStorage:', error);
            return [];
        }
    }

    /**
     * Clear messages from localStorage for the given key
     */
    static clearMessages(persistenceKey: string): void {
        try {
            const storageKey = this.STORAGE_PREFIX + persistenceKey;
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.warn('Failed to clear chat messages from localStorage:', error);
        }
    }

    /**
     * Check if localStorage is available
     */
    static isAvailable(): boolean {
        try {
            const testKey = '__promptbook_storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }
}
