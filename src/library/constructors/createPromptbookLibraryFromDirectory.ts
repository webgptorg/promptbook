import type { readdir as readdirType, readFile as readFileType } from 'fs/promises';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import { validatePromptbookJson } from '../../conversion/validation/validatePromptbookJson';
import { PromptbookLibraryError } from '../../errors/PromptbookLibraryError';
import { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
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
     * If true, the library creation outputs information about each file it reads
     *
     * @default false
     */
    isVerbose?: boolean;

    /**
     * If true, directory will be scanned only when needed not during the construction
     *
     * @default false
     */
    isLazyLoaded?: boolean;

    /**
     * If true, whole library creation crashes on error in any promptbook
     * If true and isLazyLoaded is true, the error is thrown on first access to the promptbook
     *
     * @default true
     */
    isCrashOnError?: boolean;
};

/**
 * Constructs Promptbook from given directory
 *
 * Note: Works only in Node.js environment because it reads the file system
 *
 * @param path - path to the directory with promptbooks
 * @param options - Misc options for the library
 * @returns PromptbookLibrary
 */
export async function createPromptbookLibraryFromDirectory(
    path: string_folder_path,
    options?: CreatePromptbookLibraryFromDirectoryOptions,
): Promise<PromptbookLibrary> {
    if (!isRunningInNode()) {
        throw new Error(
            'Function `createPromptbookLibraryFromDirectory` can only be run in Node.js environment because it reads the file system.',
        );
    }

    const { isRecursive = true, isVerbose = false, isLazyLoaded = false, isCrashOnError = true } = options || {};

    const library = createPromptbookLibraryFromPromise(async () => {
        if (isVerbose) {
            console.info(`Creating promptbook library from path ${path}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fsPromises = require(just('fs/promises') /* <- Note: [1] */);
        const readFile = fsPromises.readFile as typeof readFileType;

        const fileNames = await listAllFiles(path, isRecursive);

        if (isVerbose) {
            console.info('createPromptbookLibraryFromDirectory', { path, isRecursive, fileNames });
        }

        const promptbooks: Array<PromptbookJson> = [];

        for (const fileName of fileNames) {
            try {
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

                        if (!isCrashOnError) {
                            // Note: Validate promptbook to check if it is logically correct to not crash on invalid promptbooks
                            //       But be handled in current try-catch block
                            validatePromptbookJson(promptbook);
                        }

                        // Note: [🦄] Promptbook with same url uniqueness will be checked automatically in SimplePromptbookLibrary
                        promptbooks.push(promptbook);
                    }
                }
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                const wrappedErrorMessage = spaceTrim(
                    (block) => `
                        Error during loading promptbook from file ${fileName.split('\\').join('/')}:

                        ${block((error as Error).message)}

                    `,
                );

                if (isCrashOnError) {
                    throw new PromptbookLibraryError(wrappedErrorMessage);
                }

                console.error(wrappedErrorMessage);
            }
        }

        return promptbooks;
    });

    if (isLazyLoaded === false) {
        await library.listPromptbooks();
    }

    return library;
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
 *       [🍓][🚯] maybe make `@promptbook/library` package
 * TODO: Fix the dynamic import issue in Webpack (! Not working !)
 *     > ./node_modules/@promptbook/core/esm/index.es.js
 *     > Critical dependency: the request of a dependency is an expression
 *
 * Note: [1] Using require(just('fs/promises')) to allow
 *     the `@promptbook/core` work for both Node.js and browser environments
 */
