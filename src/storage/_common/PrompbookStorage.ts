import { Promisable } from 'type-fest';

/**
 * Storage of objects with asynchronous API
 *
 * Note: Naming `PrompbookStorage` not `Storage` to avoid name collision with global `Storage` interface.
 * Note: This is simmilar to Web Storage API interface but everything is asynchronous and can store JSON objects.
 */
export type PrompbookStorage<TItem> = {
    /**
     * Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object
     */
    getItem(key: string): Promisable<TItem | null>;

    /**
     * Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists
     */

    removeItem(key: string): Promisable<void>;

    /**
     * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously
     */
    setItem(key: string, value: TItem): Promisable<void>;
};
