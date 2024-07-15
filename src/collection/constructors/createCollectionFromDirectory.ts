import colors from 'colors';
import { access, constants, readdir, readFile } from 'fs/promises';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { PIPELINE_COLLECTION_BASE_FILENAME } from '../../config';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { CollectionError } from '../../errors/CollectionError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../../types/PipelineString';
import type { string_file_path, string_folder_path } from '../../types/typeAliases';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import type { PipelineCollection } from '../PipelineCollection';
import { createCollectionFromPromise } from './createCollectionFromPromise';

/**
 * Options for `createCollectionFromDirectory` function
 */
type CreatePipelineCollectionFromDirectoryOptions = {
    /**
     * If true, the directory is searched recursively for promptbooks
     *
     * @default true
     */
    isRecursive?: boolean;

    /**
     * If true, the collection creation outputs information about each file it reads
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
     * If true, whole collection creation crashes on error in any promptbook
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
 * @param options - Misc options for the collection
 * @returns PipelineCollection
 */
export async function createCollectionFromDirectory(
    path: string_folder_path,
    options?: CreatePipelineCollectionFromDirectoryOptions,
): Promise<PipelineCollection> {
    if (!isRunningInNode()) {
        throw new Error(
            'Function `createCollectionFromDirectory` can only be run in Node.js environment because it reads the file system.',
        );
    }

    const makedLibraryFilePath = join(path, `${PIPELINE_COLLECTION_BASE_FILENAME}.json`);
    const makedLibraryFileExists = await access(makedLibraryFilePath, constants.R_OK)
        .then(() => true)
        .catch(() => false);

    if (!makedLibraryFileExists) {
        console.info(
            colors.yellow(
                `Tip: Prebuild your pipeline collection (file with supposed prebuild ${makedLibraryFilePath} not found) with CLI util "ptbk make" to speed up the collection creation.`,
            ),
        );
    } else {
        colors.green(
            `(In future, not implemented yet) Using your prebuild pipeline collection ${makedLibraryFilePath}`,
        );
        // TODO: !! Implement;
    }

    const { isRecursive = true, isVerbose = false, isLazyLoaded = false, isCrashOnError = true } = options || {};

    const collection = createCollectionFromPromise(async () => {
        if (isVerbose) {
            console.info(`Creating pipeline collection from path ${path.split('\\').join('/')}`);
        }

        const fileNames = await listAllFiles(path, isRecursive);

        const promptbooks: Array<PipelineJson> = [];

        for (const fileName of fileNames) {
            try {
                let promptbook: PipelineJson | null = null;

                if (fileName.endsWith('.ptbk.md')) {
                    const pipelineString = (await readFile(fileName, 'utf8')) as PipelineString;
                    promptbook = await pipelineStringToJson(pipelineString);
                } else if (fileName.endsWith('.ptbk.json')) {
                    if (isVerbose) {
                        console.info(`Loading ${fileName.split('\\').join('/')}`);
                    }

                    // TODO: Handle non-valid JSON files
                    promptbook = JSON.parse(await readFile(fileName, 'utf8')) as PipelineJson;
                } else {
                    if (isVerbose) {
                        console.info(`Skipping file ${fileName.split('\\').join('/')}`);
                    }
                }

                // ---

                if (promptbook !== null) {
                    if (!promptbook.pipelineUrl) {
                        if (isVerbose) {
                            console.info(`Not loading ${fileName.split('\\').join('/')} - missing URL`);
                        }
                    } else {
                        if (isVerbose) {
                            console.info(`Loading ${fileName.split('\\').join('/')}`);
                        }

                        if (!isCrashOnError) {
                            // Note: Validate promptbook to check if it is logically correct to not crash on invalid promptbooks
                            //       But be handled in current try-catch block
                            validatePipeline(promptbook);
                        }

                        // Note: [🦄] Promptbook with same url uniqueness will be checked automatically in SimplePipelineCollection
                        promptbooks.push(promptbook);
                    }
                }
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                const wrappedErrorMessage = spaceTrim(
                    (block) => `
                        Error during loading pipeline from file ${fileName.split('\\').join('/')}:

                        ${block((error as Error).message)}

                    `,
                );

                if (isCrashOnError) {
                    throw new CollectionError(wrappedErrorMessage);
                }

                console.error(wrappedErrorMessage);
            }
        }

        return promptbooks;
    });

    if (isLazyLoaded === false) {
        await collection.listPipelines();
    }

    return collection;
}

/**
 * Reads all files in the directory
 *
 * @param path
 * @param isRecursive
 * @returns List of all files in the directory
 * @private internal function for `createCollectionFromDirectory`
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
