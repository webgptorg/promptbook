import type { string_dirname } from '../../types/typeAliases';

/**
 * Configuration options for the FileCacheStorage implementation.
 * Defines how and where file cache data should be stored and managed.
 */
export type FileCacheStorageOptions = {
    /**
     * The absolute path to the root directory where cache files will be stored.
     * This directory must exist and be writable by the application.
     */
    rootFolderPath: string_dirname;
};
