import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { readFile } from 'fs/promises';
import { dirname, join, relative } from 'path';
import { spaceTrim } from 'spacetrim';
import { DEFAULT_IS_VERBOSE, DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME } from '../../../config';
import { loadArchive } from '../../../conversion/archive/loadArchive';
import { compilePipeline } from '../../../conversion/compilePipeline';
import { pipelineJsonToString } from '../../../conversion/pipelineJsonToString';
import { validatePipeline } from '../../../conversion/validation/validatePipeline';
import { assertsError } from '../../../errors/assertsError';
import { CollectionError } from '../../../errors/CollectionError';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { PipelineUrlError } from '../../../errors/PipelineUrlError';
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
 * This is not same as `path` which is the first argument of `createPipelineCollectionFromDirectory` - it can be a subfolder
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
 * Tools used by `createPipelineCollectionFromDirectory`.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
type CreatePipelineCollectionFromDirectoryTools = Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>;

/**
 * Tools with guaranteed filesystem access used by `createPipelineCollectionFromDirectory`.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
type CreatePipelineCollectionFromDirectoryToolsWithFilesystem = CreatePipelineCollectionFromDirectoryTools & {
    readonly fs: NonNullable<CreatePipelineCollectionFromDirectoryTools['fs']>;
};

/**
 * Resolved options used internally by `createPipelineCollectionFromDirectory`.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
type ResolvedCreatePipelineCollectionFromDirectoryOptions = {
    readonly isRecursive: boolean;
    readonly isVerbose: boolean;
    readonly isLazyLoaded: boolean;
    readonly isCrashedOnError: boolean;
    readonly rootUrl?: string_pipeline_root_url;
};

/**
 * Pipeline loaded from a concrete file together with its filesystem metadata.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
type PipelineFromFile = {
    readonly fileName: string_filename;
    readonly sourceFile: string_filename;
    readonly pipeline: PipelineJson;
};

/**
 * Normalized metadata derived from a pipeline file path.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
type PipelineFileContext = {
    readonly sourceFile: string_filename;
    readonly rootDirname: string_dirname;
};

/**
 * Constructs `PipelineCollection` from given directory
 *
 * Note: Works only in Node.js environment because it reads the file system
 *
 * @param rootPath - path to the directory with pipelines
 * @param tools - Execution tools to be used for pipeline preparation if needed - If not provided, `$provideExecutionToolsForNode` will be used
 * @param options - Options for the collection creation
 * @returns PipelineCollection
 *
 * @public exported from `@promptbook/node`
 */
export async function createPipelineCollectionFromDirectory(
    rootPath: string_dirname,
    tools?: CreatePipelineCollectionFromDirectoryTools,
    options?: CreatePipelineCollectionFromDirectoryOptions,
): Promise<PipelineCollection> {
    const resolvedTools = await resolveCreatePipelineCollectionFromDirectoryTools(tools);
    const resolvedOptions = resolveCreatePipelineCollectionFromDirectoryOptions(options);

    await inspectCompiledPipelineCollection(rootPath, resolvedTools.fs);

    const collection = createPipelineCollectionFromPromise(async () =>
        loadPipelineCollectionFromDirectory(rootPath, resolvedTools, resolvedOptions),
    );

    if (resolvedOptions.isLazyLoaded === false) {
        await collection.listPipelines();
    }

    return collection;
}

/**
 * Resolves the execution tools needed for directory-backed collections.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
async function resolveCreatePipelineCollectionFromDirectoryTools(
    tools?: CreatePipelineCollectionFromDirectoryTools,
): Promise<CreatePipelineCollectionFromDirectoryToolsWithFilesystem> {
    if (tools === undefined) {
        tools = await $provideExecutionToolsForNode();
    }

    if (tools === undefined || tools.fs === undefined) {
        throw new EnvironmentMismatchError('Can not create collection without filesystem tools');
        //          <- TODO: [🧠] What is the best error type here`
    }

    return { ...tools, fs: tools.fs };
}

/**
 * Resolves default option values used during directory-backed collection loading.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function resolveCreatePipelineCollectionFromDirectoryOptions(
    options?: CreatePipelineCollectionFromDirectoryOptions,
): ResolvedCreatePipelineCollectionFromDirectoryOptions {
    const {
        isRecursive = true,
        isVerbose = DEFAULT_IS_VERBOSE,
        isLazyLoaded = false,
        isCrashedOnError = true,
        rootUrl,
    } = options || {};

    return {
        isRecursive,
        isVerbose,
        isLazyLoaded,
        isCrashedOnError,
        rootUrl,
    };
}

/**
 * Checks whether a precompiled collection file is present.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
async function inspectCompiledPipelineCollection(
    rootPath: string_dirname,
    fs: CreatePipelineCollectionFromDirectoryToolsWithFilesystem['fs'],
): Promise<void> {
    // TODO: [🍖] Allow to skip

    const madeLibraryFilePath = join(
        rootPath,
        `${
            DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME
            // <- TODO: [🦒] Allow to override (pass different value into the function)
        }.bookc`,
    );

    if (!(await isFileExisting(madeLibraryFilePath, fs))) {
        /*
        TODO: [🌗][🧠] Should this message be here or just ignore
        console.info(
            colors.yellow(
                `Tip: Compile your pipeline collection (file with supposed prebuild ${madeLibraryFilePath} not found) with CLI util "ptbk make" to speed up the collection creation.`,
            ),
        );
        */
        return;
    }

    colors.green(`(In future, not implemented yet) Using your compiled pipeline collection ${madeLibraryFilePath}`);
    // TODO: Implement;
    // TODO: [🌗]
}

/**
 * Loads, normalizes, and validates all pipelines from the directory.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
async function loadPipelineCollectionFromDirectory(
    rootPath: string_dirname,
    tools: CreatePipelineCollectionFromDirectoryToolsWithFilesystem,
    options: ResolvedCreatePipelineCollectionFromDirectoryOptions,
): Promise<ReadonlyArray<PipelineJson>> {
    if (options.isVerbose) {
        console.info(
            colors.cyan(`Creating pipeline collection from path ${normalizePipelineCollectionPath(rootPath)}`),
        );
    }

    const fileNames = sortPipelineCollectionFileNames(await listAllFiles(rootPath, options.isRecursive, tools.fs));
    const pipelinesFromFiles = await loadPipelinesFromFiles(fileNames, tools, options);

    return createPipelineCollectionFromLoadedPipelines(rootPath, pipelinesFromFiles, options);
}

/**
 * Sorts pipeline files so precompiled archives are considered before source files.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function sortPipelineCollectionFileNames(fileNames: ReadonlyArray<string_filename>): Array<string_filename> {
    return [...fileNames].sort(comparePipelineCollectionFileNames);
}

/**
 * Compares two pipeline file names by their loading priority.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function comparePipelineCollectionFileNames(a: string_filename, b: string_filename): number {
    if (isCompiledPipelineFile(a) && isSourcePipelineFile(b)) {
        return -1;
    }

    if (isSourcePipelineFile(a) && isCompiledPipelineFile(b)) {
        return 1;
    }

    return 0;
}

/**
 * Loads pipelines from files while keeping file-origin metadata for later registration.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
async function loadPipelinesFromFiles(
    fileNames: ReadonlyArray<string_filename>,
    tools: CreatePipelineCollectionFromDirectoryToolsWithFilesystem,
    options: ResolvedCreatePipelineCollectionFromDirectoryOptions,
): Promise<Array<PipelineFromFile>> {
    const pipelinesFromFiles: Array<PipelineFromFile> = [];

    for (const fileName of fileNames) {
        try {
            pipelinesFromFiles.push(...(await loadPipelinesFromFile(fileName, tools, options.isVerbose)));
        } catch (error) {
            handlePipelineCollectionFileError(error, fileName, options.isCrashedOnError);
        }
    }

    return pipelinesFromFiles;
}

/**
 * Loads all pipelines represented by a single filesystem file.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
async function loadPipelinesFromFile(
    fileName: string_filename,
    tools: CreatePipelineCollectionFromDirectoryToolsWithFilesystem,
    isVerbose: boolean,
): Promise<ReadonlyArray<PipelineFromFile>> {
    const fileContext = createPipelineFileContext(fileName);

    if (isSourcePipelineFile(fileName)) {
        const pipelineString = validatePipelineString(await readFile(fileName, 'utf-8'));
        const pipeline = await compilePipeline(pipelineString, tools, {
            rootDirname: fileContext.rootDirname,
        });

        return [
            {
                fileName,
                sourceFile: fileContext.sourceFile,
                pipeline: { ...pipeline, sourceFile: fileContext.sourceFile },
            },
        ];
    }

    if (isCompiledPipelineFile(fileName)) {
        return (await loadArchive(fileName, tools.fs)).map((pipeline) => ({
            fileName,
            sourceFile: fileContext.sourceFile,
            // TODO: [🌗]
            pipeline: { ...pipeline, sourceFile: fileContext.sourceFile },
        }));
    }

    if (isVerbose) {
        console.info(colors.gray(`Skipped file ${normalizePipelineCollectionPath(fileName)} – Not a book`));
    }

    return [];
}

/**
 * Creates normalized file metadata used during pipeline loading.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function createPipelineFileContext(fileName: string_filename): PipelineFileContext {
    const sourceFile: string_filename = `./${normalizePipelineCollectionPath(fileName)}`;
    const rootDirname: string_dirname = dirname(sourceFile).split('\\').join('/');

    return { sourceFile, rootDirname };
}

/**
 * Registers loaded pipelines into the final collection map.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function createPipelineCollectionFromLoadedPipelines(
    rootPath: string_dirname,
    pipelinesFromFiles: ReadonlyArray<PipelineFromFile>,
    options: ResolvedCreatePipelineCollectionFromDirectoryOptions,
): ReadonlyArray<PipelineJson> {
    const collection = new Map<string_pipeline_url, PipelineJson>();

    for (const pipelineFromFile of pipelinesFromFiles) {
        try {
            const pipeline = applyRootUrlToPipeline(rootPath, pipelineFromFile, options.rootUrl, options.isVerbose);
            addPipelineToCollection(collection, pipelineFromFile.fileName, pipeline, options.isVerbose);
        } catch (error) {
            handlePipelineCollectionFileError(error, pipelineFromFile.fileName, options.isCrashedOnError);
        }
    }

    return Array.from(collection.values());
}

/**
 * Applies the collection root URL policy to a loaded pipeline.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function applyRootUrlToPipeline(
    rootPath: string_dirname,
    pipelineFromFile: PipelineFromFile,
    rootUrl: string_pipeline_root_url | undefined,
    isVerbose: boolean,
): PipelineJson {
    let { pipeline } = pipelineFromFile;

    if (rootUrl === undefined) {
        return pipeline;
    }

    if (pipeline.pipelineUrl === undefined) {
        const pipelineUrl = createImplicitPipelineUrl(rootPath, rootUrl, pipelineFromFile.fileName);

        if (isVerbose) {
            console.info(
                colors.yellow(
                    `Implicitly set pipeline URL to ${pipelineUrl} from ${normalizePipelineCollectionPath(
                        pipelineFromFile.fileName,
                    )}`,
                ),
            );
        }

        pipeline = { ...pipeline, pipelineUrl };
    } else if (!pipeline.pipelineUrl.startsWith(rootUrl)) {
        throw new PipelineUrlError(
            spaceTrim(`
                Pipeline with URL ${pipeline.pipelineUrl} is not a child of the root URL ${rootUrl} 🍏

                File:
                ${pipelineFromFile.sourceFile || 'Unknown'}

            `),
        );
    }

    return pipeline;
}

/**
 * Creates an implicit pipeline URL for pipelines missing an explicit one.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function createImplicitPipelineUrl(
    rootPath: string_dirname,
    rootUrl: string_pipeline_root_url,
    fileName: string_filename,
): string_pipeline_url {
    return `${rootUrl}/${relative(rootPath, fileName).split('\\').join('/')}`;
}

/**
 * Validates a pipeline and inserts it into the collection when it is unique enough to keep.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function addPipelineToCollection(
    collection: Map<string_pipeline_url, PipelineJson>,
    fileName: string_filename,
    pipeline: PipelineJson,
    isVerbose: boolean,
): void {
    if (pipeline.pipelineUrl === undefined) {
        if (isVerbose) {
            console.info(
                colors.yellow(
                    `Can not load pipeline from ${normalizePipelineCollectionPath(fileName)} because of missing URL`,
                ),
            );
        }

        return;
    }

    // Note: [🐨] Pipeline is checked multiple times
    // TODO: Maybe once is enough BUT be sure to check it - better to check it multiple times than not at all
    validatePipeline(pipeline);

    const existingPipeline = collection.get(pipeline.pipelineUrl);

    if (existingPipeline === undefined) {
        if (isVerbose) {
            console.info(colors.green(`Loaded pipeline ${normalizePipelineCollectionPath(fileName)}`));
        }

        // Note: [🦄] Pipeline with same url uniqueness will be double-checked automatically in SimplePipelineCollection
        collection.set(pipeline.pipelineUrl, pipeline);
        return;
    }

    if (arePipelinesIdentical(pipeline, existingPipeline)) {
        if (isVerbose) {
            console.info(
                colors.gray(
                    `Skipped pipeline ${normalizePipelineCollectionPath(
                        fileName,
                    )} – Already identical pipeline in the collection`,
                ),
            );
        }

        return;
    }

    throw new PipelineUrlError(
        spaceTrim(`
            Pipeline with URL ${pipeline.pipelineUrl} is already in the collection 🍏

            Conflicting files:
            ${existingPipeline.sourceFile || 'Unknown'}
            ${pipeline.sourceFile || 'Unknown'}

            Note: You have probably forgotten to run "ptbk make" to update the collection
            Note: Pipelines with the same URL are not allowed
                  Only exception is when the pipelines are identical

        `),
    );
}

/**
 * Compares two pipelines while ignoring preparation artifacts.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function arePipelinesIdentical(firstPipeline: PipelineJson, secondPipeline: PipelineJson): boolean {
    return (
        pipelineJsonToString(unpreparePipeline(firstPipeline)) ===
        pipelineJsonToString(unpreparePipeline(secondPipeline))
    );
}

/**
 * Wraps a file-processing error into collection-level behavior.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function handlePipelineCollectionFileError(error: unknown, fileName: string_filename, isCrashedOnError: boolean): void {
    assertsError(error);

    const wrappedErrorMessage = createPipelineCollectionErrorMessage(error, fileName);

    if (isCrashedOnError) {
        throw new CollectionError(wrappedErrorMessage);
    }

    // TODO: [🟥] Detect browser / node and make it colorful
    console.error(wrappedErrorMessage);
}

/**
 * Creates the shared wrapped error message used for collection-loading failures.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function createPipelineCollectionErrorMessage(error: Error, fileName: string_filename): string {
    return (
        spaceTrim(
            (block) => `
                ${error.name} in pipeline ${normalizePipelineCollectionPath(fileName)}:

                Original error message:
                ${block(error.message)}

                Original stack trace:
                ${block(error.stack || '')}

                ---

            `,
        ) + '\n'
    );
}

/**
 * Detects source pipeline files that need compilation.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function isSourcePipelineFile(fileName: string_filename): boolean {
    return fileName.endsWith('.book') || fileName.endsWith('.book.md');
}

/**
 * Detects precompiled pipeline files that should be loaded before source files.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function isCompiledPipelineFile(fileName: string_filename): boolean {
    return fileName.endsWith('.bookc') || fileName.endsWith('.book.json');
}

/**
 * Normalizes filesystem paths for logs and error messages.
 *
 * @private internal function of `createPipelineCollectionFromDirectory`
 */
function normalizePipelineCollectionPath(path: string): string {
    return path.split('\\').join('/');
}

// TODO: [🖇] What about symlinks? Maybe option `isSymlinksFollowed`
// TODO: Maybe move from `@promptbook/node` to `@promptbook/core` as we removes direct dependency on `fs`
