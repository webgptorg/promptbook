import type { string_mime_type } from '../../../../../../src/types/typeAliases';
import type { IStorage } from './IStorage';

export type IFile = {
    // Maybe TODO name: string_name;
    type: string_mime_type;
    data: Buffer;
};

/**
 * Represents storage that will store each keypair in a separate file.
 */
export type IFilesStorage = Omit<IStorage<IFile>, 'length' | 'clear' | 'key'>;

/**
 * Represents storage that can give public deterministic  URL for each file
 */
export type IIFilesStorageWithCdn = IFilesStorage & {
    readonly cdnPublicUrl: URL;
    getItemUrl(key: string): URL;
};

/**
 * TODO: Probably not deterministic and async getItemUrl
 * TODO: Probably just createUrlMaker
 * TODO: List method
 * TODO: Glob method
 * TODO: Subfolder (similar to PrefixStorage) method
 * TODO: Subscribe, list, sub(folder) should be part of LIB everstorage
 * TODO: Probably implement observe through RxJS
 * TODO: [☹️] Unite with `PromptbookStorage` and move to `/src/...`
 */
