import type { PromptbookStorage } from '../_common/PromptbookStorage';

/**
 * Stores
 */
export class MemoryStorage<TItem> implements PromptbookStorage<TItem> {
    private storage: Record<string, TItem | null> = {};

    /**
     * Returns the number of key/value pairs currently present in the list associated with the object.
     */
    public get length(): number {
        return Object.keys(this.storage).length;
    }

    /**
     * Empties the list associated with the object of all key/value pairs, if there are any.
     */
    public clear(): void {
        this.storage = {};
    }

    /**
     * Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    public getItem(key: string): TItem | null {
        return this.storage[key] || null;
    }

    /**
     * Returns the name of the nth key in the list, or null if n is greater than or equal to the number of key/value pairs in the object.
     */
    public key(index: number): string | null {
        return Object.keys(this.storage)[index] || null;
    }

    /**
     * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    public setItem(key: string, value: TItem): void {
        this.storage[key] = value;
    }

    /**
     * Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     */
    public removeItem(key: string): void {
        delete this.storage[key];
    }
}
