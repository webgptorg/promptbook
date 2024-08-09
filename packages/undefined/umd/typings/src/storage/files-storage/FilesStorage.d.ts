import type { PromptbookStorage } from '../_common/PromptbookStorage';
import type { FilesStorageOptions } from './FilesStorageOptions';
/**
 * @@@
 *
 * @public exported from `@promptbook/node`
 */
export declare class FilesStorage<TItem> implements PromptbookStorage<TItem> {
    private readonly options;
    constructor(options: FilesStorageOptions);
    /**
     * @@@
     */
    private getFilenameForKey;
    /**
     * @@@ Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    getItem(key: string): Promise<TItem | null>;
    /**
     * @@@ Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    setItem(key: string, value: TItem): Promise<void>;
    /**
     * @@@ Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     */
    removeItem(key: string): Promise<void>;
}
/**
 * TODO: [🌗] Maybe some checkers, not all valid JSONs are desired and valid values
 * Note: [🟢] This code should never be published outside of `@promptbook/node`
 */
