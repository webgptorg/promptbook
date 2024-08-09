import type { PromptbookStorage } from '../_common/PromptbookStorage';
/**
 * Stores
 *
 * @public exported from `@promptbook/core`
 */
export declare class MemoryStorage<TItem> implements PromptbookStorage<TItem> {
    private storage;
    /**
     * Returns the number of key/value pairs currently present in the list associated with the object.
     */
    get length(): number;
    /**
     * Empties the list associated with the object of all key/value pairs, if there are any.
     */
    clear(): void;
    /**
     * Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    getItem(key: string): TItem | null;
    /**
     * Returns the name of the nth key in the list, or null if n is greater than or equal to the number of key/value pairs in the object.
     */
    key(index: number): string | null;
    /**
     * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    setItem(key: string, value: TItem): void;
    /**
     * Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     */
    removeItem(key: string): void;
}
