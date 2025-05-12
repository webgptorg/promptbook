import type { PromptbookStorage } from '../../_common/PromptbookStorage';
import { IndexedDbStorageOptions } from './IndexedDbStorageOptions';

/**
 * Creates a PromptbookStorage backed by IndexedDB.
 * Uses a single object store named 'promptbook'.
 * @private for `getIndexedDbStorage`
 */
export function makePromptbookStorageFromIndexedDb<TValue>(
    options: IndexedDbStorageOptions,
): PromptbookStorage<TValue> {
    const { databaseName, storeName } = options;

    function getDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName, 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore(storeName);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    return {
        async getItem(key: string): Promise<TValue | null> {
            console.log('!!! IndexedDB getItem', key);

            const database = await getDatabase();
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(storeName, 'readonly');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.get(key);
                request.onsuccess = () => resolve(request.result ?? null);
                request.onerror = () => reject(request.error);
            });
        },
        async setItem(key: string, value: TValue): Promise<void> {
            console.log('!!! IndexedDB setItem', key, { value });

            const database = await getDatabase();
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(storeName, 'readwrite');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.put(value, key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },
        async removeItem(key: string): Promise<void> {
            console.log('!!! IndexedDB removeItem', key);

            const database = await getDatabase();
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(storeName, 'readwrite');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },
    };
}
