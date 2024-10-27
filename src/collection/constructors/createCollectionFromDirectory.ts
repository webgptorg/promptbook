import colors from 'colors';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import spaceTrim from 'spacetrim';
import { IS_VERBOSE, PIPELINE_COLLECTION_BASE_FILENAME } from '../../config';
import { pipelineJsonToString } from '../../conversion/pipelineJsonToString';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { CollectionError } from '../../errors/CollectionError';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { PipelineUrlError } from '../../errors/PipelineUrlError';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { $provideExecutionToolsForNode } from '../../execution/utils/$provideExecutionToolsForNode';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { unpreparePipeline } from '../../prepare/unpreparePipeline';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../../types/PipelineString';
import type { string_dirname, string_pipeline_url } from '../../types/typeAliases';
import { isFileExisting } from '../../utils/files/isFileExisting';
import { listAllFiles } from '../../utils/files/listAllFiles';
import type { PipelineCollection } from '../PipelineCollection';
import { createCollectionFromPromise } from './createCollectionFromPromise';

/**
 * Options for `createCollectionFromDirectory` function
 *
 * Note: `rootDirname` is not needed because it is the folder in which `.ptbk.md` file is located
 *       This is not same as `path` which is the first argument of `createCollectionFromDirectory` - it can be a subfolder
 */
type CreatePipelineCollectionFromDirectoryOptions = Omit<PrepareAndScrapeOptions, 'rootDirname'> & {
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

    // [🍖] Add `isCacheReloaded`
    //                <- TODO: !!!!!! Replace by `intermediateFilesStrategy`
};

/**
 * Constructs Pipeline from given directory
 *
 * Note: Works only in Node.js environment because it reads the file system
 *
 * @param path - path to the directory with pipelines
 * @param tools - Execution tools to be used for pipeline preparation if needed - If not provided, `$provideExecutionToolsForNode` will be used
 * @param options - Options for the collection creation
 * @returns PipelineCollection
 * @public exported from `@promptbook/node`
 */
export async function createCollectionFromDirectory(
    path: string_dirname,
    tools?: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>,
    options?: CreatePipelineCollectionFromDirectoryOptions,
): Promise<PipelineCollection> {
    if (tools === undefined) {
        tools = await $provideExecutionToolsForNode();
    }

    if (tools === undefined || tools.fs === undefined) {
        throw new EnvironmentMismatchError('Can not create collection without filesystem tools');
        //          <- TODO: [🧠] What is the best error type here`
    }

    // TODO: [🍖] Allow to skip
    const makedLibraryFilePath = join(path, `${PIPELINE_COLLECTION_BASE_FILENAME}.json`);

    if (!(await isFileExisting(makedLibraryFilePath, tools.fs))) {
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

        const fileNames = await listAllFiles(path, isRecursive, tools!.fs!);

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
            const rootDirname = dirname(sourceFile).split('\\').join('/');

            try {
                let pipeline: PipelineJson | null = null;

                if (fileName.endsWith('.ptbk.md')) {
                    const pipelineString = (await readFile(fileName, 'utf-8')) as PipelineString;
                    pipeline = await pipelineStringToJson(pipelineString, tools, {
                        rootDirname,
                    });
                    pipeline = { ...pipeline, sourceFile };
                } else if (fileName.endsWith('.ptbk.json')) {
                    // TODO: Handle non-valid JSON files
                    pipeline = JSON.parse(await readFile(fileName, 'utf-8')) as PipelineJson;
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
 * TODO: [🖇] What about symlinks? Maybe option isSymlinksFollowed
 * TODO: Maybe move from `@promptbook/node` to `@promptbook/core` as we removes direct dependency on `fs`
 */
