import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { readFile } from 'fs/promises';
import { dirname, join, relative } from 'path';
import spaceTrim from 'spacetrim';
import { DEFAULT_IS_VERBOSE, DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME } from '../../../config';
import { loadArchive } from '../../../conversion/archive/loadArchive';
import { compilePipeline } from '../../../conversion/compilePipeline';
import { pipelineJsonToString } from '../../../conversion/pipelineJsonToString';
import { validatePipeline } from '../../../conversion/validation/validatePipeline';
import { CollectionError } from '../../../errors/CollectionError';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { PipelineUrlError } from '../../../errors/PipelineUrlError';
import { assertsError } from '../../../errors/assertsError';
import type { ExecutionTools } from '../../../execution/ExecutionTools';
import { $provideExecutionToolsForNode } from '../../../execution/utils/$provideExecutionToolsForNode';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import { validatePipelineString } from '../../../pipeline/validatePipelineString';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { unpreparePipeline } from '../../../prepare/unpreparePipeline';
import type {
    string_dirname,
    string_filename,
    string_pipeline_root_url,
    string_pipeline_url,
} from '../../../types/typeAliases';
import { isFileExisting } from '../../../utils/files/isFileExisting';
import { listAllFiles } from '../../../utils/files/listAllFiles';
import type { PipelineCollection } from '../PipelineCollection';
import { createPipelineCollectionFromPromise } from './createPipelineCollectionFromPromise';

/**
 * Options for `createPipelineCollectionFromDirectory` function
 *
 * Note: `rootDirname` is not needed because it is the folder in which `.book` or `.book` file is located
 *       This is not same as `path` which is the first argument of `createPipelineCollectionFromDirectory` - it can be a subfolder
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
     * This will be used as a root URL for all pipelines in the collection
     *
     * It has 2 purposes:
     * 1) Every pipeline in the collection is checked if it is a child of `rootUrl`
     * 2) If the pipeline does not have a URL, it is created from the `rootUrl` and path to the pipeline
     *
     * @default false
     */
    rootUrl?: string_pipeline_root_url;

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

    // <- TODO: [🍖] Add `intermediateFilesStrategy`
};

/**
 * Constructs Pipeline from given directory
 *
 * Note: Works only in Node.js environment because it reads the file system
 *
 * @param rootPath - path to the directory with pipelines
 * @param tools - Execution tools to be used for pipeline preparation if needed - If not provided, `$provideExecutionToolsForNode` will be used
 * @param options - Options for the collection creation
 * @returns PipelineCollection
 * @public exported from `@promptbook/node`
 */
export async function createPipelineCollectionFromDirectory(
    rootPath: string_dirname,
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

    const madeLibraryFilePath = join(
        rootPath,
        `${
            DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME
            // <- TODO: [🦒] Allow to override (pass different value into the function)
        }.bookc`,
    );

    if (!(await isFileExisting(madeLibraryFilePath, tools.fs))) {
        /*
        TODO: [🌗][🧠] Should this message be here or just ignore
        console.info(
            colors.yellow(
                `Tip: Compile your pipeline collection (file with supposed prebuild ${madeLibraryFilePath} not found) with CLI util "ptbk make" to speed up the collection creation.`,
            ),
        );
        */
    } else {
        colors.green(`(In future, not implemented yet) Using your compiled pipeline collection ${madeLibraryFilePath}`);
        // TODO: Implement;
        // TODO: [🌗]
    }

    const {
        isRecursive = true,
        isVerbose = DEFAULT_IS_VERBOSE,
        isLazyLoaded = false,
        isCrashedOnError = true,
        rootUrl,
    } = options || {};

    const collection = createPipelineCollectionFromPromise(async () => {
        if (isVerbose) {
            console.info(colors.cyan(`Creating pipeline collection from path ${rootPath.split('\\').join('/')}`));
        }

        const fileNames = await listAllFiles(rootPath, isRecursive, tools!.fs!);

        // Note: First load compiled `.bookc` files and then source `.book` files
        //       `.bookc` are already compiled and can be used faster
        fileNames.sort((a, b) => {
            if ((a.endsWith('.bookc') || a.endsWith('.book.json')) && (b.endsWith('.book') || b.endsWith('.book.md'))) {
                return -1;
            }
            if ((a.endsWith('.book') || a.endsWith('.book.md')) && (b.endsWith('.bookc') || b.endsWith('.book.json'))) {
                return 1;
            }
            return 0;
        });

        const collection = new Map<string_pipeline_url, PipelineJson>();
        const pipelinesWithFilenames: Array<{
            fileName: string_filename;
            sourceFile: string_filename;
            pipeline: PipelineJson;
        }> = [];

        for (const fileName of fileNames) {
            const sourceFile = './' + fileName.split('\\').join('/');
            const rootDirname = dirname(sourceFile).split('\\').join('/');

            try {
                if (fileName.endsWith('.book') || fileName.endsWith('.book.md')) {
                    const pipelineString = validatePipelineString(await readFile(fileName, 'utf-8'));
                    const pipeline = await compilePipeline(pipelineString, tools, {
                        rootDirname,
                    });
                    pipelinesWithFilenames.push({ fileName, sourceFile, pipeline: { ...pipeline, sourceFile } });
                } else if (fileName.endsWith('.bookc') || fileName.endsWith('.book.json')) {
                    // TODO: Handle non-valid JSON files

                    pipelinesWithFilenames.push(
                        ...(await loadArchive(fileName, tools!.fs!)).map((pipeline) =>
                            // TODO: [🌗]
                            ({ fileName, sourceFile, pipeline: { ...pipeline, sourceFile } }),
                        ),
                    );
                } else {
                    if (isVerbose) {
                        console.info(
                            colors.gray(`Skipped file ${fileName.split('\\').join('/')} –⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠ Not a book`),
                        );
                    }
                }

                // ---
            } catch (error) {
                assertsError(error);

                // TODO: [7] DRY
                const wrappedErrorMessage =
                    spaceTrim(
                        (block) => `
                            ${(error as Error).name} in pipeline ${fileName.split('\\').join('/')}⁠:

                            Original error message:
                            ${block((error as Error).message)}

                            Original stack trace:
                            ${block((error as Error).stack || '')}

                            ---

                        `,
                    ) + '\n';

                if (isCrashedOnError) {
                    throw new CollectionError(wrappedErrorMessage);
                }

                // TODO: [🟥] Detect browser / node and make it colorful
                console.error(wrappedErrorMessage);
            }
        }

        for (const pipelineWithFilenames of pipelinesWithFilenames) {
            const { fileName, sourceFile } = pipelineWithFilenames;
            let { pipeline } = pipelineWithFilenames;

            try {
                if (rootUrl !== undefined) {
                    if (pipeline.pipelineUrl === undefined) {
                        const pipelineUrl = rootUrl + '/' + relative(rootPath, fileName).split('\\').join('/');

                        // console.log({ pipelineUrl, rootPath, rootUrl, fileName });

                        if (isVerbose) {
                            console.info(
                                colors.yellow(
                                    `Implicitly set pipeline URL to ${pipelineUrl} from ${fileName
                                        .split('\\')
                                        .join('/')}`,
                                ),
                            );
                        }
                        pipeline = { ...pipeline, pipelineUrl };
                    } else if (!pipeline.pipelineUrl.startsWith(rootUrl)) {
                        throw new PipelineUrlError(
                            spaceTrim(`
                                Pipeline with URL ${pipeline.pipelineUrl} is not a child of the root URL ${rootUrl} 🍏

                                File:
                                ${sourceFile || 'Unknown'}

                            `),
                        );
                    }
                }

                // TODO: [👠] DRY
                if (pipeline.pipelineUrl === undefined) {
                    if (isVerbose) {
                        console.info(
                            colors.yellow(
                                `Can not load pipeline from ${fileName.split('\\').join('/')} because of missing URL`,
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
                            console.info(colors.green(`Loaded pipeline ${fileName.split('\\').join('/')}⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠⁠`));
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
                                Pipeline with URL ${pipeline.pipelineUrl} is already in the collection 🍏

                                Conflicting files:
                                ${existing.sourceFile || 'Unknown'}
                                ${pipeline.sourceFile || 'Unknown'}

                                Note: You have probably forgotten to run "ptbk make" to update the collection
                                Note: Pipelines with the same URL are not allowed
                                      Only exception is when the pipelines are identical

                            `),
                        );
                    }
                }
            } catch (error) {
                assertsError(error);

                // TODO: [7] DRY
                const wrappedErrorMessage =
                    spaceTrim(
                        (block) => `
                            ${(error as Error).name} in pipeline ${fileName.split('\\').join('/')}⁠:

                            Original error message:
                            ${block((error as Error).message)}

                            Original stack trace:
                            ${block((error as Error).stack || '')}

                            ---

                        `,
                    ) + '\n';

                if (isCrashedOnError) {
                    throw new CollectionError(wrappedErrorMessage);
                }

                // TODO: [🟥] Detect browser / node and make it colorful
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
