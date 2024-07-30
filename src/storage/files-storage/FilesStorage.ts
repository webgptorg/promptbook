import { string_file_path } from '../../types/typeAliases';
import { PromptbookStorage } from '../_common/PromptbookStorage';
import { FilesStorageOptions } from './FilesStorageOptions';

/**
 * @@@
 */
export class FilesStorage<TItem> implements PromptbookStorage<TItem> {
    constructor(private readonly options: FilesStorageOptions) {}

    /**
     * @@@
     */
    private getFilenameForKey(key: string): string_file_path {}

    /**
     * @@@ Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    public getItem(key: string): TItem | null {}

    /**
     * @@@ Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     */
    public removeItem(key: string): void {}

    /**
     * @@@ Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    public setItem(key: string, value: TItem): void {}
}
