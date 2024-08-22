import colors from 'colors';
import { readFile } from 'fs/promises';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { IS_VERBOSE } from '../../config';
import { PIPELINE_COLLECTION_BASE_FILENAME } from '../../config';
import { pipelineJsonToString } from '../../conversion/pipelineJsonToString';
import type { PipelineStringToJsonOptions } from '../../conversion/pipelineStringToJson';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { CollectionError } from '../../errors/CollectionError';
import { PipelineUrlError } from '../../errors/PipelineUrlError';
import { unpreparePipeline } from '../../prepare/unpreparePipeline';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../../types/PipelineString';
import type { string_folder_path } from '../../types/typeAliases';
import type { string_pipeline_url } from '../../types/typeAliases';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { $isFileExisting } from '../../utils/files/$isFileExisting';
import { $listAllFiles } from '../../utils/files/$listAllFiles';
import type { PipelineCollection } from '../PipelineCollection';
import { createCollectionFromPromise } from './createCollectionFromPromise';

/**
 * Options for `createCollectionFromDirectory` function
 */
type CreatePipelineCollectionFromDirectoryOptions = PipelineStringToJsonOptions & {
    /**
     * If true, the directory is searched recursively for pipelines
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
     * If true, whole collection creation crashes on error in any pipeline
     * If true and isLazyLoaded is true, the error is thrown on first access to the pipeline
     *
     * @default true
     */
    isCrashedOnError?: boolean;
};

/**
 * Constructs Pipeline from given directory
 *
 * Note: Works only in Node.js environment because it reads the file system
 *
 * @param path - path to the directory with pipelines
 * @param options - Misc options for the collection
 * @returns PipelineCollection
 * @public exported from `@promptbook/node`
 */
export async function createCollectionFromDirectory(
    path: string_folder_path,
    options?: CreatePipelineCollectionFromDirectoryOptions,
): Promise<PipelineCollection> {
    if (!$isRunningInNode()) {
        throw new Error(
            'Function `createCollectionFromDirectory` can only be run in Node.js environment because it reads the file system.',
        );
    }

    // TODO: [🍖] Allow to skip
    const makedLibraryFilePath = join(path, `${PIPELINE_COLLECTION_BASE_FILENAME}.json`);

    if (!(await $isFileExisting(makedLibraryFilePath))) {
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
        // TODO: [🌗]
    }

    const { isRecursive = true, isVerbose = IS_VERBOSE, isLazyLoaded = false, isCrashedOnError = true } = options || {};

    const collection = createCollectionFromPromise(async () => {
        if (isVerbose) {
            console.info(colors.cyan(`Creating pipeline collection from path ${path.split('\\').join('/')}`));
        }

        const fileNames = await $listAllFiles(path, isRecursive);

        // Note: First load all .ptbk.json and then .ptbk.md files
        //       .ptbk.json can be prepared so it is faster to load
        fileNames.sort((a, b) => {
            if (a.endsWith('.ptbk.json') && b.endsWith('.ptbk.md')) {
                return -1;
            }
            if (a.endsWith('.ptbk.md') && b.endsWith('.ptbk.json')) {
                return 1;
            }
            return 0;
        });

        const collection = new Map<string_pipeline_url, PipelineJson>();

        for (const fileName of fileNames) {
            const sourceFile = './' + fileName.split('\\').join('/');

            try {
                let pipeline: PipelineJson | null = null;

                if (fileName.endsWith('.ptbk.md')) {
                    const pipelineString = (await readFile(fileName, 'utf8')) as PipelineString;
                    pipeline = await pipelineStringToJson(pipelineString, options);
                    pipeline = { ...pipeline, sourceFile };
                } else if (fileName.endsWith('.ptbk.json')) {
                    // TODO: Handle non-valid JSON files
                    pipeline = JSON.parse(await readFile(fileName, 'utf8')) as PipelineJson;
                    // TODO: [🌗]
                    pipeline = { ...pipeline, sourceFile };
                } else {
                    if (isVerbose) {
                        console.info(
                            colors.gray(
                                `Skipped file ${fileName.split('\\').join('/')} –⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠ Not a pipeline`,
                            ),
                        );
                    }
                }

                // ---

                if (pipeline !== null) {
                    // TODO: [👠] DRY
                    if (pipeline.pipelineUrl === undefined) {
                        if (isVerbose) {
                            console.info(
                                colors.red(
                                    `Can not load pipeline from ${fileName
                                        .split('\\')
                                        .join('/')} because of missing URL`,
                                ),
                            );
                        }
                    } else {
                        // Note: [🐨] Pipeline is checked multiple times
                        // TODO: Maybe once is enough BUT be sure to check it - better to check it multiple times than not at all
                        validatePipeline(pipeline);

                        if (
                            // TODO: [🐽] comparePipelines(pipeline1,pipeline2): 'IDENTICAL' |'IDENTICAL_UNPREPARED' | 'IDENTICAL_INTERFACE' | 'DIFFERENT'
                            !collection.has(pipeline.pipelineUrl)
                        ) {
                            if (isVerbose) {
                                console.info(
                                    colors.green(`Loaded pipeline ${fileName.split('\\').join('/')}⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠`),
                                );
                            }

                            // Note: [🦄] Pipeline with same url uniqueness will be double-checked automatically in SimplePipelineCollection
                            collection.set(pipeline.pipelineUrl, pipeline);
                        } else if (
                            pipelineJsonToString(unpreparePipeline(pipeline)) ===
                            pipelineJsonToString(unpreparePipeline(collection.get(pipeline.pipelineUrl)!))
                        ) {
                            if (isVerbose) {
                                console.info(
                                    colors.gray(
                                        `Skipped pipeline ${fileName
                                            .split('\\')
                                            .join('/')} –⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠ Already identical pipeline in the collection`,
                                    ),
                                );
                            }
                        } else {
                            const existing = collection.get(pipeline.pipelineUrl)!;

                            throw new PipelineUrlError(
                                spaceTrim(`
                                    Pipeline with URL "${pipeline.pipelineUrl}" is already in the collection 🍏

                                    Conflicting files:
                                    ${existing.sourceFile || 'Unknown'}
                                    ${pipeline.sourceFile || 'Unknown'}

                                    Note: You have probably forgotten to run "ptbk make" to update the collection
                                    Note: Pipelines with the same URL are not allowed
                                          Only exepction is when the pipelines are identical

                                `),
                            );
                        }
                    }
                }
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                const wrappedErrorMessage = spaceTrim(
                    (block) => `
                        ${(error as Error).name} in pipeline ${fileName.split('\\').join('/')}⁠:

                        ${block((error as Error).message)}

                    `,
                );

                if (isCrashedOnError) {
                    throw new CollectionError(wrappedErrorMessage);
                }

                // TODO: [🟥] Detect browser / node and make it colorfull
                console.error(wrappedErrorMessage);
            }
        }

        return Array.from(collection.values());
    });

    if (isLazyLoaded === false) {
        await collection.listPipelines();
    }

    return collection;
}

/**
 * Note: [🟢] This code should never be published outside of `@promptbook/node` and `@promptbook/cli` and `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe option isSymlinksFollowed
 */
