import { string_date_iso8601 } from '../../../types/typeAliases';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
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
     * In-memory fallback storage used when browser storage is unavailable or throws.
     */
    private static readonly MEMORY_STORAGE = new Map<string, string>();

    /**
     * Builds normalized storage key for one persistence scope.
     */
    private static resolveStorageKey(persistenceKey: string): string {
        return this.STORAGE_PREFIX + persistenceKey;
    }

    /**
     * Stores serialized payload in the in-memory fallback store.
     */
    private static saveToMemoryStorage(storageKey: string, serializedMessages: string): void {
        this.MEMORY_STORAGE.set(storageKey, serializedMessages);
    }

    /**
     * Resolves serialized payload from localStorage and falls back to in-memory storage.
     */
    private static loadSerializedMessages(storageKey: string): string | null {
        try {
            const localStorageValue = localStorage.getItem(storageKey);
            if (localStorageValue !== null) {
                this.saveToMemoryStorage(storageKey, localStorageValue);
                return localStorageValue;
            }
        } catch (error) {
            console.warn('Failed to load chat messages from localStorage:', error);
        }

        return this.MEMORY_STORAGE.get(storageKey) || null;
    }

    /**
     * Save messages to localStorage under the given key
     */
    static saveMessages(persistenceKey: string, messages: ReadonlyArray<ChatMessage>): void {
        const storageKey = this.resolveStorageKey(persistenceKey);

        try {
            const serializableMessages: SerializableChatMessage[] = messages.map((message) => {
                const createdAtValue = (message as { createdAt?: string | Date }).createdAt;
                const createdAt =
                    createdAtValue instanceof Date ? createdAtValue.toISOString() : createdAtValue || $getCurrentDate();

                return {
                    ...message,
                    createdAt: createdAt as string_date_iso8601,
                };
            });

            const serializedMessages = JSON.stringify(serializableMessages);
            this.saveToMemoryStorage(storageKey, serializedMessages);
            localStorage.setItem(storageKey, serializedMessages);
        } catch (error) {
            console.warn('Failed to save chat messages to localStorage:', error);
        }
    }

    /**
     * Load messages from localStorage for the given key
     */
    static loadMessages(persistenceKey: string): ChatMessage[] {
        try {
            const storageKey = this.resolveStorageKey(persistenceKey);
            const stored = this.loadSerializedMessages(storageKey);

            if (!stored) {
                return [];
            }

            const serializableMessages: SerializableChatMessage[] = JSON.parse(stored);

            return serializableMessages.map((message) => ({
                ...message,
                createdAt: message.createdAt,
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
        const storageKey = this.resolveStorageKey(persistenceKey);
        this.MEMORY_STORAGE.delete(storageKey);

        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.warn('Failed to clear chat messages from localStorage:', error);
        }
    }

    /**
     * Check if localStorage is available
     */
    static isAvailable(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        try {
            const testKey = '__promptbook_storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return true;
        }
    }
}
