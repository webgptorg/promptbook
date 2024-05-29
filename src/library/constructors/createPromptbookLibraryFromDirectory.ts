import { type readdir as readdirType } from 'fs/promises';
import { join } from 'path';
import { string_folder_path } from '../../types/typeAliases';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { just } from '../../utils/just';
import { PromptbookLibrary } from '../PromptbookLibrary';
import { createPromptbookLibraryFromPromise } from './createPromptbookLibraryFromPromise';

/**
 * Options for `createPromptbookLibraryFromDirectory` function
 */
type CreatePromptbookLibraryFromDirectoryOptions = {
    /**
     * If true, the directory is searched recursively for promptbooks
     *
     * @default true
     */
    isRecursive?: boolean;
};

/**
 * Constructs Promptbook from given directory
 *
 * Note: Works only in Node.js environment because it reads the file system
 * Note: The function does NOT return promise it returns the library directly which dynamically loads promptbooks when needed
 *       SO during the construction syntax and logic sources IS NOT validated
 *
 * @param path - path to the directory with promptbooks
 * @param options - Misc options for the library
 * @returns PromptbookLibrary
 */
export function createPromptbookLibraryFromDirectory(
    path: string_folder_path,
    options?: CreatePromptbookLibraryFromDirectoryOptions,
): PromptbookLibrary {
    if (!isRunningInNode()) {
        throw new Error(
            'Function `createPromptbookLibraryFromDirectory` can only be run in Node.js environment because it reads the file system.',
        );
    }

    const { isRecursive = true } = options || {};

    return createPromptbookLibraryFromPromise(async () => {
        const justR_equire = require; /* <- Note: [1] */
        const readdir = justR_equire(just('fs/promises') /* <- Note: [2] */).readdir as typeof readdirType;

        // TODO: !!!! Implement recursive reading
        // TODO: !!!!! readAllFiles util

        const dirents = await readdir(path, {
            withFileTypes: true /* Note: This is not working: recursive: isRecursive */,
        });
        const fileNames = dirents.filter((dirent) => dirent.isFile()).map(({ name }) => join(name, path));

        // TODO: !!! Implement

        console.info('createPromptbookLibraryFromDirectory', { path, isRecursive, fileNames });
        throw new Error('Not implemented yet');

        return [];
    });
}

/***
 * Note: [1] Fixing the dynamic import issue in Webpack
 *     > ./node_modules/@promptbook/core/esm/index.es.js
 *     > Critical dependency: the request of a dependency is an expression
 *
 * Note: [2] Using require(just('fs/promises')) to allow
 *     the `@promptbook/core` work for both Node.js and browser environments
 * TODO: [🍓][🚯] !!! Add to README and samples + maybe make `@promptbook/library` package
 */
