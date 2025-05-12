import { string_name } from '../../../types/typeAliases';

/**
 * Options for IndexedDB storage
 */
export type IndexedDbStorageOptions = {
    /**
     * Name of the database
     */
    databaseName: string_name;

    /**
     * Name of the object store (table) in the database
     */
    storeName: string_name;
};
