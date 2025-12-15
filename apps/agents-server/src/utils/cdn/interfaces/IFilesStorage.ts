import type { string_mime_type } from '../../../../../../src/types/typeAliases';
import type { IStorage } from './IStorage';

export type IFile = {
    // Maybe TODO name: string_name;
    type: string_mime_type;
    data: Buffer;

    /**
     * User who uploaded the file
     */
    userId?: number;

    /**
     * Purpose of the upload (e.g. KNOWLEDGE, SERVER_FAVICON_URL)
     */
    purpose?: string;

    /**
     * Size of the file in bytes
     *
     * Note: This is optional, if not provided, the size of the buffer is used
     */
    fileSize?: number;
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
    readonly pathPrefix?: string;
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
