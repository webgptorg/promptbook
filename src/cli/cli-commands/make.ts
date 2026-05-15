import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { createPipelineCollectionFromDirectory } from '../../collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory';
import { pipelineCollectionToJson } from '../../collection/pipeline-collection/pipelineCollectionToJson';
import {
    DEFAULT_BOOKS_DIRNAME,
    DEFAULT_GET_PIPELINE_COLLECTION_FUNCTION_NAME,
    DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME,
    GENERATOR_WARNING_BY_PROMPTBOOK_CLI,
} from '../../config';
import { saveArchive } from '../../conversion/archive/saveArchive';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { usageToHuman } from '../../execution/utils/usageToHuman';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import { $provideScriptingForNode } from '../../scrapers/_common/register/$provideScriptingForNode';
import type { string_file_extension } from '../../types/string_sha256';
import type { string_promptbook_server_url } from '../../types/string_promptbook_server_url';
import { stringifyPipelineJson } from '../../utils/editable/utils/stringifyPipelineJson';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import { isValidJavascriptName } from '../../utils/validators/javascriptName/isValidJavascriptName';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import { $provideLlmToolsForCli } from '../common/$provideLlmToolsForCli';
import { handleActionErrors } from './common/handleActionErrors';

keepTypeImported<ExecutionTools>();

/**
 * Raw Commander option bag accepted by the `make` command action.
 */
type MakeCommandCliOptions = {
    readonly projectName: string;
    readonly rootUrl?: string;
    readonly format: false | string;
    readonly functionName: string;
    readonly validation: false | string;
    readonly reload: boolean;
    readonly interactive: boolean;
    readonly verbose: boolean;
    readonly provider: string;
    readonly remoteServerUrl: string_promptbook_server_url;
    readonly output: string;
};

/**
 * Validated and normalized runtime options for the `make` command flow.
 */
type MakeCommandOptions = {
    readonly path: string;
    readonly projectName: string;
    readonly rootUrl?: string;
    readonly formats: ReadonlyArray<string>;
    readonly functionName: string;
    readonly validations: ReadonlyArray<string>;
    readonly isCacheReloaded: boolean;
    readonly isVerbose: boolean;
    readonly output: string;
    readonly cliOptions: MakeCommandCliOptions;
};

/**
 * Execution dependencies created for the `make` command run.
 */
type MakeCommandExecutionContext = {
    readonly llm: Awaited<ReturnType<typeof $provideLlmToolsForCli>>['llm'];
    readonly fs: ReturnType<typeof $provideFilesystemForNode>;
    readonly tools: ExecutionTools;
};

/**
 * Built collection together with the pipeline urls used for follow-up validation.
 */
type MakeCommandCollection = {
    readonly collection: Awaited<ReturnType<typeof createPipelineCollectionFromDirectory>>;
    readonly pipelineUrls: ReadonlyArray<string>;
};

/**
 * Serialized collection outputs reused by the various output writers.
 */
type MakeCommandArtifacts = {
    readonly collectionJson: ReadonlyArray<PipelineJson>;
    readonly collectionJsonString: string;
    readonly collectionJsonItems: string;
};

/**
 * File writer prepared for the chosen `make` command output target.
 */
type SaveMakeFile = (
    extension: string_file_extension,
    content: string | ReadonlyArray<PipelineJson>,
) => Promise<void>;

/**
 * Initializes `make` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeMakeCommand(program: Program): $side_effect {
    const makeCommand = program.command('make');

    configureMakeCommand(makeCommand);
    makeCommand.action(handleActionErrors((path, cliOptions) => $runMakeCommand(path, cliOptions as MakeCommandCliOptions)));
}

/**
 * Applies the static description, aliases, arguments, and options for `ptbk make`.
 */
function configureMakeCommand(makeCommand: Program): void {
    makeCommand.description(
        spaceTrim(`
            Makes a new pipeline collection in given folder
        `),
    );

    makeCommand.alias('compile');
    makeCommand.alias('prepare');
    makeCommand.alias('build');

    // TODO: [🧅] DRY command arguments

    makeCommand.argument(
        '[path]',
        // <- TODO: [🧟‍♂️] Unite path to promptbook collection argument
        'Path to promptbook collection directory',
        DEFAULT_BOOKS_DIRNAME,
    );
    makeCommand.option('--project-name', `Name of the project for whom collection is`, 'Untitled Promptbook project');
    makeCommand.option('--root-url <url>', `Root URL of all pipelines to make`, undefined);
    makeCommand.option(
        '-f, --format <format>',
        spaceTrim(`
            Output format of builded collection "bookc", "javascript", "typescript" or "json"

            Note: You can use multiple formats separated by comma
        `),
        'bookc' /* <- Note: [🏳‍🌈] */,
    );
    makeCommand.option('--no-validation', `Do not validate logic of pipelines in collection`, true);
    makeCommand.option(
        '--validation',
        `Types of validations separated by comma (options "logic","imports")`,
        'logic,imports',
    );

    makeCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache`, false);
    makeCommand.option(
        '-o, --output <path>',
        spaceTrim(`
            Where to save the builded collection

            Note: If you keep it "${DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME}" it will be saved in the root of the promptbook directory
                  If you set it to a path, it will be saved in that path
                  BUT you can use only one format and set correct extension
        `),
        DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME,
    );
    makeCommand.option(
        '-fn, --function-name <functionName>',
        spaceTrim(`
            Name of the function to get pipeline collection

            Note: This can be used only with "javascript" or "typescript" format

        `),
        DEFAULT_GET_PIPELINE_COLLECTION_FUNCTION_NAME,
    );
}

/**
 * Executes the `make` command as a sequence of explicit preparation, validation, build, and save steps.
 */
async function $runMakeCommand(path: string, cliOptions: MakeCommandCliOptions): Promise<$side_effect> {
    const options = normalizeMakeCommandOptions(path, cliOptions);
    const executionContext = await createMakeCommandExecutionContext(options);
    const makeCommandCollection = await createMakeCommandCollection(options, executionContext.tools);

    await validateMakeCommandCollection(makeCommandCollection, options.validations, options.isVerbose);

    const artifacts = await createMakeCommandArtifacts(makeCommandCollection.collection);
    const saveFile = createSaveMakeFile(options.path, options.output, executionContext.fs);

    await saveRequestedMakeFormats(options.formats, artifacts, saveFile, options.projectName, options.functionName);

    console.info(colors.green(`Collection builded successfully`));
    if (options.isVerbose) {
        console.info(colors.cyan(usageToHuman(executionContext.llm.getTotalUsage())));
    }

    return process.exit(0);
}

/**
 * Validates command-line inputs and converts comma-separated options into structured runtime values.
 */
function normalizeMakeCommandOptions(path: string, cliOptions: MakeCommandCliOptions): MakeCommandOptions {
    const {
        projectName,
        rootUrl,
        format,
        functionName,
        validation,
        reload: isCacheReloaded,
        verbose: isVerbose,
        output,
    } = cliOptions;
    const formats = parseCommaSeparatedOptionValues(format);
    const validations = parseCommaSeparatedOptionValues(validation);

    if (!isValidJavascriptName(functionName)) {
        failMakeCommand(`Function name "${functionName}" is not valid javascript name`);
    }

    if (
        rootUrl !== undefined &&
        !isValidUrl(rootUrl) /* <- Note: Not using `isValidPipelineUrl` because this is root url not book url */
    ) {
        failMakeCommand(`Root URL ${rootUrl} is not valid URL`);
    }

    if (output !== DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME && formats.length !== 1) {
        failMakeCommand(`You can only use one format if you specify --out-file`);
    }

    return {
        path,
        projectName,
        rootUrl,
        formats,
        functionName,
        validations,
        isCacheReloaded,
        isVerbose,
        output,
        cliOptions,
    };
}

/**
 * Creates the filesystem, LLM, scraper, and scripting tools needed for one `make` command run.
 */
async function createMakeCommandExecutionContext(
    options: MakeCommandOptions,
): Promise<MakeCommandExecutionContext> {
    // TODO: DRY [◽]
    const prepareAndScrapeOptions = {
        isVerbose: options.isVerbose,
        isCacheReloaded: options.isCacheReloaded,
    }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
    const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
    const { llm } = await $provideLlmToolsForCli({
        cliOptions: options.cliOptions,
        ...prepareAndScrapeOptions,
    });
    const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
    const tools = {
        llm,
        fs,

        scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
        script: await $provideScriptingForNode({}),
    } satisfies ExecutionTools;

    return { llm, fs, tools };
}

/**
 * Loads the source directory into a pipeline collection and ensures there is at least one pipeline to build.
 */
async function createMakeCommandCollection(
    options: MakeCommandOptions,
    tools: ExecutionTools,
): Promise<MakeCommandCollection> {
    // TODO: [🧟‍♂️][◽] DRY:
    const collection = await createPipelineCollectionFromDirectory(options.path, tools, {
        isVerbose: options.isVerbose,
        rootUrl: options.rootUrl,
        isRecursive: true,
        isLazyLoaded: false,
        isCrashedOnError: true,
        // <- TODO: [🍖] Add `intermediateFilesStrategy`
    });

    const pipelineUrls = await collection.listPipelines();

    if (pipelineUrls.length === 0) {
        failMakeCommand(`No books found in "${options.path}"`);
    }

    return { collection, pipelineUrls };
}

/**
 * Applies all requested validations to each pipeline in the collection.
 */
async function validateMakeCommandCollection(
    makeCommandCollection: MakeCommandCollection,
    validations: ReadonlyArray<string>,
    isVerbose: boolean,
): Promise<void> {
    for (const validation of validations) {
        for (const pipelineUrl of makeCommandCollection.pipelineUrls) {
            const pipeline = await makeCommandCollection.collection.getPipelineByUrl(pipelineUrl);

            if (validation === 'logic') {
                validatePipeline(pipeline);

                if (isVerbose) {
                    console.info(colors.cyan(`Validated logic of ${pipeline.pipelineUrl}`));
                }
            }

            // TODO: Imports validation
        }
    }
}

/**
 * Serializes the collection into all reusable string and archive representations needed by the output writers.
 */
async function createMakeCommandArtifacts(
    collection: Awaited<ReturnType<typeof createPipelineCollectionFromDirectory>>,
): Promise<MakeCommandArtifacts> {
    const collectionJson = await pipelineCollectionToJson(collection);
    const collectionJsonString = stringifyPipelineJson(collectionJson).trim();

    return {
        collectionJson,
        collectionJsonString,
        collectionJsonItems: extractCollectionJsonItems(collectionJsonString),
    };
}

/**
 * Extracts the array body from the serialized collection JSON while preserving the existing invariants.
 */
function extractCollectionJsonItems(collectionJsonString: string): string {
    const firstChar = collectionJsonString.charAt(0);

    if (firstChar !== '[') {
        throw new UnexpectedError(`First character of serialized collection should be "[" not "${firstChar}"`);
    }

    const lastChar = collectionJsonString.charAt(collectionJsonString.length - 1);
    if (lastChar !== ']') {
        throw new UnexpectedError(`Last character of serialized collection should be "]" not "${lastChar}"`);
    }

    return spaceTrim(collectionJsonString.substring(1, collectionJsonString.length - 1));
}

/**
 * Creates the file saver that resolves output filenames and writes either archive or text outputs.
 */
function createSaveMakeFile(
    path: string,
    output: string,
    fs: ReturnType<typeof $provideFilesystemForNode>,
): SaveMakeFile {
    return async (extension, content) => {
        const filename =
            output !== DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME
                ? output
                : join(path, `${DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME}.${extension}`);

        if (!output.endsWith(`.${extension}`)) {
            console.warn(colors.yellow(`Warning: Extension of output file should be "${extension}"`));
            // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
        }

        await mkdir(dirname(filename), { recursive: true });

        if (typeof content === 'string') {
            await writeFile(filename, content, 'utf-8');
        } else {
            await saveArchive(filename, content, fs);
        }

        // Note: Log despite of verbose mode
        console.info(colors.green(`Made ${filename.split('\\').join('/')}`));
    };
}

/**
 * Saves all requested output formats in the same order and with the same alias handling as before the refactor.
 */
async function saveRequestedMakeFormats(
    formats: ReadonlyArray<string>,
    artifacts: MakeCommandArtifacts,
    saveFile: SaveMakeFile,
    projectName: string,
    functionName: string,
): Promise<void> {
    let remainingFormats = [...formats];

    if (remainingFormats.includes('bookc')) {
        remainingFormats = removeConsumedFormats(remainingFormats, ['bookc']);
        await saveFile('bookc', artifacts.collectionJson);
    }

    if (remainingFormats.includes('json')) {
        remainingFormats = removeConsumedFormats(remainingFormats, ['json']);
        await saveFile('json', artifacts.collectionJsonString);
        //                            <- TODO: Add GENERATOR_WARNING_BY_PROMPTBOOK_CLI to package.json
    }

    if (remainingFormats.includes('javascript') || remainingFormats.includes('js')) {
        remainingFormats = removeConsumedFormats(remainingFormats, ['javascript', 'js']);
        await saveFile(
            'js',
            renderJavascriptCollectionFactory(projectName, functionName, artifacts.collectionJsonItems),
        );
    }

    if (remainingFormats.includes('typescript') || remainingFormats.includes('ts')) {
        remainingFormats = removeConsumedFormats(remainingFormats, ['typescript', 'ts']);
        await saveFile(
            'ts',
            renderTypescriptCollectionFactory(projectName, functionName, artifacts.collectionJsonItems),
        );
    }

    if (remainingFormats.length > 0) {
        console.warn(colors.yellow(`Format ${remainingFormats.join(' and ')} is not supported`));
        // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
    }
}

/**
 * Removes a handled format name together with all of its aliases from the remaining-format list.
 */
function removeConsumedFormats(
    formats: ReadonlyArray<string>,
    consumedFormats: ReadonlyArray<string>,
): string[] {
    return formats.filter((format) => !consumedFormats.includes(format));
}

/**
 * Renders the JavaScript module wrapper for the compiled pipeline collection.
 */
function renderJavascriptCollectionFactory(
    projectName: string,
    functionName: string,
    collectionJsonItems: string,
): string {
    return (
        spaceTrim(
            (block) => `
                // ${block(GENERATOR_WARNING_BY_PROMPTBOOK_CLI)}

                import { createPipelineCollectionFromJson } from '@promptbook/core';

                /**
                 * Pipeline collection for ${projectName}
                 *
                 * ${block(GENERATOR_WARNING_BY_PROMPTBOOK_CLI)}
                 *
                 * @generated
                 * @private internal cache for \`${functionName}\`
                 */
                let pipelineCollection = null;


                /**
                 * Get pipeline collection for ${projectName}
                 *
                 * ${block(GENERATOR_WARNING_BY_PROMPTBOOK_CLI)}
                 *
                 * @generated
                 * @returns {PipelineCollection} Library of promptbooks for ${projectName}
                 */
                export function ${functionName}(){
                    if(pipelineCollection===null){
                        pipelineCollection = createPipelineCollectionFromJson(
                            ${block(collectionJsonItems)}
                        );
                    }

                    return pipelineCollection;
                }
            `,
        ) + '\n'
    );
    // <- TODO: [0] DRY Javascript and typescript
    // <- TODO: Prettify
    // <- TODO: Convert inlined \n to spaceTrim
    // <- Note: [🍡]
}

/**
 * Renders the TypeScript module wrapper for the compiled pipeline collection.
 */
function renderTypescriptCollectionFactory(
    projectName: string,
    functionName: string,
    collectionJsonItems: string,
): string {
    return (
        spaceTrim(
            (block) => `
                // ${block(GENERATOR_WARNING_BY_PROMPTBOOK_CLI)}

                import { createPipelineCollectionFromJson } from '@promptbook/core';
                import type { PipelineCollection } from '@promptbook/types';

                /**
                 * Pipeline collection for ${projectName}
                 *
                 * ${block(GENERATOR_WARNING_BY_PROMPTBOOK_CLI)}
                 *
                 * @private internal cache for \`${functionName}\`
                 * @generated
                 */
                let pipelineCollection: null | PipelineCollection = null;


                /**
                 * Get pipeline collection for ${projectName}
                 *
                 * ${block(GENERATOR_WARNING_BY_PROMPTBOOK_CLI)}
                 *
                 * @generated
                 * @returns {PipelineCollection} Library of promptbooks for ${projectName}
                 */
                export function ${functionName}(): PipelineCollection{

                    if(pipelineCollection===null){
                        // TODO: !!6 Use book string literal notation
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        pipelineCollection = (createPipelineCollectionFromJson as (..._: any) => PipelineCollection)(
                            ${block(collectionJsonItems)}
                        );
                    }

                    return pipelineCollection;
                }
            `,
        ) + '\n'
    );
    // <- TODO: [0] DRY Javascript and typescript
    // <- TODO: Prettify
    // <- TODO: Convert inlined \n to spaceTrim
    // <- Note: [🍡]
}

/**
 * Splits a comma-separated CLI option into normalized non-empty values.
 */
function parseCommaSeparatedOptionValues(value: false | string): ReadonlyArray<string> {
    return (value || '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');
}

/**
 * Reports a fatal `make` command validation or execution problem and exits with the existing error behavior.
 */
function failMakeCommand(message: string): never {
    console.error(colors.red(message));
    return process.exit(1);
}

/** Note: [🟡] Code for CLI command [make](src/cli/cli-commands/make.ts) should never be published outside of `@promptbook/cli` */
/**
 * TODO: [🥃][main] !!3 Allow `ptbk make` without configuring any llm tools
 * TODO: [0] DRY Javascript and typescript - Maybe make ONLY typescript and for javascript just remove types
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 */
