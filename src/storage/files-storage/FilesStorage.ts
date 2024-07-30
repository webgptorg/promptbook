import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { titleToName } from '../../_packages/utils.index';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { string_file_path } from '../../types/typeAliases';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { PromptbookStorage } from '../_common/PromptbookStorage';
import { FilesStorageOptions } from './FilesStorageOptions';
import { nameToSubfolderPath } from './utils/nameToSubfolderPath';

/**
 * @@@
 */
export class FilesStorage<TItem> implements PromptbookStorage<TItem> {
    constructor(private readonly options: FilesStorageOptions) {
        if (!isRunningInNode()) {
            throw new EnvironmentMismatchError(`FilesStorage works only in Node.js environment`);
        }
    }

    /**
     * @@@
     */
    private getFilenameForKey(key: string): string_file_path {
        const name = titleToName(key);
        return join(
            this.options.cacheFolderPath,
            ...nameToSubfolderPath(name /* <- TODO: [🎎] Maybe add some SHA256 prefix */),
            `${name}.json`,
        );
    }

    /**
     * @@@ Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    public async getItem(key: string): Promise<TItem | null> {
        const filename = this.getFilenameForKey(key);

        const isFileExisting = await stat(filename)
            .then((fileStat) => fileStat.isFile())
            .catch(() => false);

        if (!isFileExisting) {
            return null;
        }

        const fileContent = await readFile(filename, 'utf-8');
        const value = JSON.parse(fileContent) as TItem;

        // TODO: [🌗]

        return value;
    }

    /**
     * @@@ Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    public async setItem(key: string, value: TItem): Promise<void> {
        const filename = this.getFilenameForKey(key);

        const fileContent = JSON.stringify(value, null, 4);

        await mkdir(dirname(filename), { recursive: true }); // <- [0]
        await writeFile(filename, fileContent, 'utf-8');
    }

    /**
     * @@@ Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     */
    public async removeItem(key: string): Promise<void> {
        const filename = this.getFilenameForKey(key);

        // TODO: [🧠] What to use `unlink` or `rm`
        await unlink(filename);

        // <- TODO: [🧠] Maybe remove empty folders
        //          [0] When `setItem` and `removeItem` called, the state of the file system should be the same
    }
}

/**
 * TODO: [🌗] Maybe some checkers, not all valid JSONs are desired and valid values
 */
