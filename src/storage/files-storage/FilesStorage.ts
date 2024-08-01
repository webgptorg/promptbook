import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { MAX_FILENAME_LENGTH } from '../../config';
import { titleToName } from '../../conversion/utils/titleToName';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { string_file_path } from '../../types/typeAliases';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import type { PromptbookStorage } from '../_common/PromptbookStorage';
import type { FilesStorageOptions } from './FilesStorageOptions';
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
        const hash = sha256(hexEncoder.parse(name)).toString(/* hex */);

        return join(
            this.options.cacheFolderPath,
            ...nameToSubfolderPath(hash /* <- TODO: [🎎] Maybe add some SHA256 prefix */),
            `${name.substring(0, MAX_FILENAME_LENGTH)}.json`,
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
 * TODO: [🔼] !!! Export via `@promptbook/node`
 * TODO: [🌗] Maybe some checkers, not all valid JSONs are desired and valid values
 * Note: [🟢] This code should never be published outside of `@promptbook/node`
 */
