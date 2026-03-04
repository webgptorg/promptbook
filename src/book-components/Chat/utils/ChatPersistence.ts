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
    private static readonly CHANGE_EVENT_NAME = 'promptbook-chat-persistence-change';

    /**
     * Builds the full localStorage key for one logical chat persistence id.
     */
    static createStorageKey(persistenceKey: string): string {
        return this.STORAGE_PREFIX + persistenceKey;
    }

    /**
     * Save messages to localStorage under the given key
     */
    static saveMessages(persistenceKey: string, messages: ReadonlyArray<ChatMessage>): void {
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

            const storageKey = this.createStorageKey(persistenceKey);
            localStorage.setItem(storageKey, JSON.stringify(serializableMessages));
            this.notifyPersistenceChange(persistenceKey);
        } catch (error) {
            console.warn('Failed to save chat messages to localStorage:', error);
        }
    }

    /**
     * Load messages from localStorage for the given key
     */
    static loadMessages(persistenceKey: string): ChatMessage[] {
        try {
            const storageKey = this.createStorageKey(persistenceKey);
            const stored = localStorage.getItem(storageKey);

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
        try {
            const storageKey = this.createStorageKey(persistenceKey);
            localStorage.removeItem(storageKey);
            this.notifyPersistenceChange(persistenceKey);
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

    /**
     * Subscribes to same-tab persistence changes emitted by ChatPersistence.
     */
    static subscribeToChanges(listener: (persistenceKey: string) => void): () => void {
        if (typeof window === 'undefined') {
            return () => {};
        }

        const eventHandler = (event: Event) => {
            const customEvent = event as CustomEvent<{ persistenceKey?: string }>;
            const changedPersistenceKey = customEvent.detail?.persistenceKey;
            if (!changedPersistenceKey) {
                return;
            }

            listener(changedPersistenceKey);
        };

        window.addEventListener(this.CHANGE_EVENT_NAME, eventHandler);
        return () => {
            window.removeEventListener(this.CHANGE_EVENT_NAME, eventHandler);
        };
    }

    /**
     * Dispatches a same-tab event so listeners can react to local persistence writes.
     */
    private static notifyPersistenceChange(persistenceKey: string): void {
        if (typeof window === 'undefined') {
            return;
        }

        window.dispatchEvent(
            new CustomEvent(this.CHANGE_EVENT_NAME, {
                detail: { persistenceKey },
            }),
        );
    }
}
