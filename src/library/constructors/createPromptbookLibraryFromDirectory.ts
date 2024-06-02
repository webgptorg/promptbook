import type { readdir as readdirType, readFile as readFileType } from 'fs/promises';
import { join } from 'path';
import { PromptbookJson } from '../../_packages/types.index';
import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import { PromptbookString } from '../../types/PromptbookString';
import { string_file_path, string_folder_path } from '../../types/typeAliases';
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

    /**
     * If true, the library ceation outputs information about each file it reads
     *
     * @default false
     */
    isVerbose?: boolean;
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

    const { isRecursive = true, isVerbose = false } = options || {};

    return createPromptbookLibraryFromPromise(async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fsPromises = require(just('fs/promises') /* <- Note: [1] */);
        const readFile = fsPromises.readFile as typeof readFileType;

        const fileNames = await listAllFiles(path, isRecursive);

        if (isVerbose) {
            console.info('createPromptbookLibraryFromDirectory', { path, isRecursive, fileNames });
        }

        const promptbooks: Array<PromptbookJson> = [];

        for (const fileName of fileNames) {
            let promptbook: PromptbookJson | null = null;

            if (fileName.endsWith('.ptbk.md')) {
                const promptbookString = (await readFile(fileName, 'utf8')) as PromptbookString;
                promptbook = promptbookStringToJson(promptbookString);
            } else if (fileName.endsWith('.ptbk.json')) {
                if (isVerbose) {
                    console.info(`Loading ${fileName}`);
                }

                // TODO: Handle non-valid JSON files
                promptbook = JSON.parse(await readFile(fileName, 'utf8')) as PromptbookJson;
            } else {
                if (isVerbose) {
                    console.info(`Skipping file ${fileName}`);
                }
            }

            // ---

            if (promptbook !== null) {
                if (!promptbook.promptbookUrl) {
                    if (isVerbose) {
                        console.info(`Not loading ${fileName} - missing URL`);
                    }
                } else {
                    if (isVerbose) {
                        console.info(`Loading ${fileName}`);
                    }

                    // Note: [🦄] Promptbook with same url uniqueness will be checked automatically in SimplePromptbookLibrary
                    promptbooks.push(promptbook);
                }
            }
        }

        return promptbooks;
    });
}

/**
 * Reads all files in the directory
 *
 * @param path
 * @param isRecursive
 * @returns List of all files in the directory
 * @private internal function for `createPromptbookLibraryFromDirectory`
 */
async function listAllFiles(path: string_folder_path, isRecursive: boolean): Promise<Array<string_file_path>> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fsPromises = require(just('fs/promises') /* <- Note: [1] */);
    const readdir = fsPromises.readdir as typeof readdirType;

    const dirents = await readdir(path, {
        withFileTypes: true /* Note: This is not working: recursive: isRecursive */,
    });

    const fileNames = dirents.filter((dirent) => dirent.isFile()).map(({ name }) => join(path, name));

    if (isRecursive) {
        for (const dirent of dirents.filter((dirent) => dirent.isDirectory())) {
            const subPath = join(path, dirent.name);
            fileNames.push(...(await listAllFiles(subPath, isRecursive)));
        }
    }

    return fileNames;
}

/***
 * TODO: [🧠] Maybe do not do hacks like [1] and just create package @promptbook/node
 * TODO: Fix the dynamic import issue in Webpack (! Not working !)
 *     > ./node_modules/@promptbook/core/esm/index.es.js
 *     > Critical dependency: the request of a dependency is an expression
 *
 * Note: [1] Using require(just('fs/promises')) to allow
 *     the `@promptbook/core` work for both Node.js and browser environments
 * TODO: [🍓][🚯] !!! Add to README and samples + maybe make `@promptbook/library` package
 */
