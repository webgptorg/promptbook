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

    function getDb(): Promise<IDBDatabase> {
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

            const db = await getDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result ?? null);
                req.onerror = () => reject(req.error);
            });
        },
        async setItem(key: string, value: TValue): Promise<void> {
            console.log('!!! IndexedDB setItem', key, { value });

            const db = await getDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.put(value, key);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        },
        async removeItem(key: string): Promise<void> {
            console.log('!!! IndexedDB removeItem', key);

            const db = await getDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.delete(key);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        },
    };
}
