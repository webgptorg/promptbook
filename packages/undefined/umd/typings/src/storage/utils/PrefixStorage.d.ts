import { Promisable } from 'type-fest';
import type { PromptbookStorage } from '../_common/PromptbookStorage';
/**
 * This class behaves like LocalStorage but separates keys by prefix
 *
 * @public exported from `@promptbook/core`
 */
export declare class PrefixStorage<TItem> implements PromptbookStorage<TItem> {
    private baseStorage;
    private keyPrefix;
    private separator;
    constructor(baseStorage: PromptbookStorage<TItem>, keyPrefix: string, separator?: string);
    /**
     * Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    getItem(key: string): Promisable<TItem | null>;
    /**
     * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    setItem(key: string, value: TItem): Promisable<void>;
    /**
     * Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     */
    removeItem(key: string): void;
}
