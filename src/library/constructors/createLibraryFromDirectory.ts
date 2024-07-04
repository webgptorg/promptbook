import colors from 'colors';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { PROMPTBOOK_MAKED_BASE_FILENAME } from '../../config';
import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import { validatePromptbookJson } from '../../conversion/validation/validatePromptbookJson';
import { PromptbookLibraryError } from '../../errors/PromptbookLibraryError';
import type { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import type { PromptbookString } from '../../types/PromptbookString';
import type { string_file_path } from '../../types/typeAliases';
import type { string_folder_path } from '../../types/typeAliases';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import type { PromptbookLibrary } from '../PromptbookLibrary';
import { createLibraryFromPromise } from './createLibraryFromPromise';

/**
 * Options for `createLibraryFromDirectory` function
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
export async function createLibraryFromDirectory(
    path: string_folder_path,
    options?: CreatePromptbookLibraryFromDirectoryOptions,
): Promise<PromptbookLibrary> {
    if (!isRunningInNode()) {
        throw new Error(
            'Function `createLibraryFromDirectory` can only be run in Node.js environment because it reads the file system.',
        );
    }

    const makedLibraryFilePath = join(path, `${PROMPTBOOK_MAKED_BASE_FILENAME}.json`);
    const makedLibraryFileStat = await stat(makedLibraryFilePath);

    if (!makedLibraryFileStat.isFile()) {
        console.info(
            colors.yellow(
                `Tip: Prebuild your promptbook library (file with supposed prebuild ${makedLibraryFilePath} not found) with CLI util "promptbook make" to speed up the library creation.`,
            ),
        );
    } else {
        colors.green(`Using your prebuild promptbook library ${makedLibraryFilePath}`);
        // TODO: !!!!! Implement;
    }

    const { isRecursive = true, isVerbose = false, isLazyLoaded = false, isCrashOnError = true } = options || {};

    const library = createLibraryFromPromise(async () => {
        if (isVerbose) {
            console.info(`Creating promptbook library from path ${path}`);
        }

        const fileNames = await listAllFiles(path, isRecursive);

        if (isVerbose) {
            console.info('createLibraryFromDirectory', { path, isRecursive, fileNames });
        }

        const promptbooks: Array<PromptbookJson> = [];

        for (const fileName of fileNames) {
            try {
                let promptbook: PromptbookJson | null = null;

                if (fileName.endsWith('.ptbk.md')) {
                    const promptbookString = (await readFile(fileName, 'utf8')) as PromptbookString;
                    promptbook = await promptbookStringToJson(promptbookString);
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
 * @private internal function for `createLibraryFromDirectory`
 */
async function listAllFiles(path: string_folder_path, isRecursive: boolean): Promise<Array<string_file_path>> {
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

/**
 * TODO: !!!! [🧠] Library precompilation and do not mix markdown and json promptbooks
 */
