import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import spaceTrim from 'spacetrim';
import { collectionToJson } from '../../collection/collectionToJson';
import { createCollectionFromDirectory } from '../../collection/constructors/createCollectionFromDirectory';
import {
    DEFAULT_BOOKS_DIRNAME,
    DEFAULT_GET_PIPELINE_COLLECTION_FUNCTION_NAME,
    DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME,
    GENERATOR_WARNING_BY_PROMPTBOOK_CLI,
} from '../../config';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { usageToHuman } from '../../execution/utils/usageToHuman';
import { $provideLlmToolsForWizzardOrCli } from '../../llm-providers/_common/register/$provideLlmToolsForWizzardOrCli';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import type { string_file_extension } from '../../types/typeAliases';
import { stringifyPipelineJson } from '../../utils/editable/utils/stringifyPipelineJson';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import { isValidJavascriptName } from '../../utils/validators/javascriptName/isValidJavascriptName';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';

keepTypeImported<ExecutionTools>();

/**
 * Initializes `make` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeMakeCommand(program: Program) {
    const makeCommand = program.command('make');
    makeCommand.description(
        spaceTrim(`
            Makes a new pipeline collection in given folder
      `),
    );

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
            Output format of builded collection "javascript", "typescript" or "json"

            Note: You can use multiple formats separated by comma
        `),
        'javascript' /* <- Note: [🏳‍🌈] */,
    );
    makeCommand.option('--no-validation', `Do not validate logic of pipelines in collection`, true);
    makeCommand.option(
        '--validation',
        `Types of validations separated by comma (options "logic","imports")`,
        'logic,imports',
    );

    makeCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache`, false);
    makeCommand.option('-v, --verbose', `Is output verbose`, false);
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

    makeCommand.action(
        async (
            path,
            {
                projectName,
                rootUrl,
                format,
                functionName,
                validation,
                reload: isCacheReloaded,
                verbose: isVerbose,
                output,
            },
        ) => {
            if (!isValidJavascriptName(functionName)) {
                console.error(colors.red(`Function name "${functionName}" is not valid javascript name`));
                return process.exit(1);
            }

            if (
                rootUrl !== undefined &&
                !isValidUrl(rootUrl) /* <- Note: Not using `isValidPipelineUrl` because this is root url not book url */
            ) {
                console.error(colors.red(`Root URL ${rootUrl} is not valid URL`));
                return process.exit(1);
            }

            let formats = ((format as string | false) || '')
                .split(',')
                .map((_) => _.trim())
                .filter((_) => _ !== '');
            const validations = ((validation as string | false) || '')
                .split(',')
                .map((_) => _.trim())
                .filter((_) => _ !== '');

            if (output !== DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME && formats.length !== 1) {
                console.error(colors.red(`You can only use one format if you specify --out-file`));
                return process.exit(1);
            }

            // TODO: DRY [◽]
            const prepareAndScrapeOptions = {
                isVerbose,
                isCacheReloaded,
            }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
            const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
            const llm = await $provideLlmToolsForWizzardOrCli(prepareAndScrapeOptions);
            const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
            const tools = {
                llm,
                fs,

                scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
                script: [
                    /*new JavascriptExecutionTools(options)*/
                ],
            } satisfies ExecutionTools;

            const collection = await createCollectionFromDirectory(path, tools, {
                isVerbose,
                rootUrl,
                isRecursive: true,
                isLazyLoaded: false,
                isCrashedOnError: true,
                // <- TODO: [🍖] Add `intermediateFilesStrategy`
            });

            const pipelinesUrls = await collection.listPipelines();

            if (pipelinesUrls.length === 0) {
                console.error(colors.red(`No books found in "${path}"`));
                return process.exit(1);
            }

            for (const validation of validations) {
                for (const pipelineUrl of pipelinesUrls) {
                    const pipeline = await collection.getPipelineByUrl(pipelineUrl);

                    if (validation === 'logic') {
                        validatePipeline(pipeline);

                        if (isVerbose) {
                            console.info(colors.cyan(`Validated logic of ${pipeline.pipelineUrl}`));
                        }
                    }

                    // TODO: Imports validation
                }
            }

            const collectionJson = await collectionToJson(collection);
            const collectionJsonString = stringifyPipelineJson(collectionJson).trim();
            const collectionJsonItems = (() => {
                const firstChar = collectionJsonString.charAt(0);

                if (firstChar !== '[') {
                    throw new UnexpectedError(
                        `First character of serialized collection should be "[" not "${firstChar}"`,
                    );
                }

                const lastChar = collectionJsonString.charAt(collectionJsonString.length - 1);
                if (lastChar !== ']') {
                    throw new UnexpectedError(
                        `Last character of serialized collection should be "]" not "${lastChar}"`,
                    );
                }

                return spaceTrim(collectionJsonString.substring(1, collectionJsonString.length - 1));
            })();

            const saveFile = async (extension: string_file_extension, content: string) => {
                const filename =
                    output !== DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME
                        ? output
                        : join(path, `${DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME}.${extension}`);

                if (!output.endsWith(`.${extension}`)) {
                    console.warn(colors.yellow(`Warning: Extension of output file should be "${extension}"`));
                }

                await mkdir(dirname(filename), { recursive: true });
                await writeFile(filename, content, 'utf-8');

                // Note: Log despite of verbose mode
                console.info(colors.green(`Made ${filename.split('\\').join('/')}`));
            };

            if (formats.includes('json')) {
                formats = formats.filter((format) => format !== 'json');
                await saveFile('json', collectionJsonString);
                //                            <- TODO: Add GENERATOR_WARNING_BY_PROMPTBOOK_CLI to package.json
            }

            if (formats.includes('javascript') || formats.includes('js')) {
                formats = formats.filter((format) => format !== 'javascript' && format !== 'js');
                (await saveFile(
                    'js',
                    spaceTrim(
                        (block) => `
                            // ${block(GENERATOR_WARNING_BY_PROMPTBOOK_CLI)}

                            import { createCollectionFromJson } from '@promptbook/core';

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
                                    pipelineCollection = createCollectionFromJson(
                                        ${block(collectionJsonItems)}
                                    );
                                }

                                return pipelineCollection;
                            }
                        `,
                    ),
                    // <- TODO: [0] DRY Javascript and typescript
                    // <- TODO: Prettify
                    // <- TODO: Convert inlined \n to spaceTrim
                    // <- Note: [🍡]
                )) + '\n';
            }

            if (formats.includes('typescript') || formats.includes('ts')) {
                formats = formats.filter((format) => format !== 'typescript' && format !== 'ts');
                await saveFile(
                    'ts',
                    spaceTrim(
                        (block) => `
                            // ${block(GENERATOR_WARNING_BY_PROMPTBOOK_CLI)}

                            import { createCollectionFromJson } from '@promptbook/core';
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
                                    pipelineCollection = (createCollectionFromJson as (..._: any) => PipelineCollection)(
                                        ${block(collectionJsonItems)}
                                    );
                                }

                                return pipelineCollection;
                            }
                        `,
                    ) + '\n',
                    // <- TODO: [0] DRY Javascript and typescript
                    // <- TODO: Prettify
                    // <- TODO: Convert inlined \n to spaceTrim
                    // <- Note: [🍡]
                );
            }

            if (formats.length > 0) {
                console.warn(colors.yellow(`Format ${formats.join(' and ')} is not supported`));
            }

            console.info(colors.green(`Collection builded successfully`));
            if (isVerbose) {
                console.info(colors.cyan(usageToHuman(llm.getTotalUsage())));
            }

            return process.exit(0);
        },
    );
}

/**
 * TODO: [🥃][main] !!3 Allow `ptbk make` without configuring any llm tools
 * TODO: [0] DRY Javascript and typescript - Maybe make ONLY typescript and for javascript just remove types
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 */
