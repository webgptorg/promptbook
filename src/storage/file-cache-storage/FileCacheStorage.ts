import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { MAX_FILENAME_LENGTH } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { string_filename } from '../../types/typeAliases';
import { stringifyPipelineJson } from '../../utils/editable/utils/stringifyPipelineJson';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { isFileExisting } from '../../utils/files/isFileExisting';
import { titleToName } from '../../utils/normalization/titleToName';
import { isSerializableAsJson } from '../../utils/serialization/isSerializableAsJson';
import type { PromptbookStorage } from '../_common/PromptbookStorage';
import type { FileCacheStorageOptions } from './FileCacheStorageOptions';
import { nameToSubfolderPath } from './utils/nameToSubfolderPath';
import { jsonParse } from '../../formats/json/utils/jsonParse';

/**
 * @@@
 *
 * @public exported from `@promptbook/node`
 */
export class FileCacheStorage<TItem> implements PromptbookStorage<TItem> {
    constructor(
        protected readonly tools: Required<Pick<ExecutionTools, 'fs'>>,
        private readonly options: FileCacheStorageOptions,
    ) {
        if (!$isRunningInNode()) {
            throw new EnvironmentMismatchError(`FileCacheStorage works only in Node.js environment`);
        }
    }

    /**
     * @@@
     */
    private getFilenameForKey(key: string): string_filename {
        // TODO: [👬] DRY
        const name = titleToName(key);
        const nameStart = name.split('-', 2)[0] || 'unnamed';
        const hash = sha256(hexEncoder.parse(name)).toString(/* hex */);
        //    <- TODO: [🥬] Encapsulate sha256 to some private utility function

        return join(
            this.options.rootFolderPath,
            nameStart, // <- Note: This mechanism is to better segment the files in .promptbook cache folder
            ...nameToSubfolderPath(hash /* <- TODO: [🎎] Maybe add some SHA256 prefix */),
            `${name.substring(0, MAX_FILENAME_LENGTH)}.json`,
        );
    }

    /**
     * @@@ Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    public async getItem(key: string): Promise<TItem | null> {
        const filename = this.getFilenameForKey(key);

        if (!(await isFileExisting(filename, this.tools.fs))) {
            return null;
        }

        const fileContent = await readFile(filename, 'utf-8');
        const value = jsonParse(fileContent) as TItem;

        // TODO: [🌗]

        return value;
    }

    /**
     * @@@ Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    public async setItem(key: string, value: TItem): Promise<void> {
        const filename = this.getFilenameForKey(key);

        if (!isSerializableAsJson(value)) {
            throw new UnexpectedError(`The "${key}" you want to store in JSON file is not serializable as JSON`);
        }

        const fileContent = stringifyPipelineJson(value);

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

        // <- TODO: [🐿][🧠] Maybe remove empty folders
        //          [0] When `setItem` and `removeItem` called, the state of the file system should be the same
    }
}

/**
 * TODO: [🌗] Maybe some checkers, not all valid JSONs are desired and valid values
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
