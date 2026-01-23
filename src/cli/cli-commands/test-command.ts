import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { readFile } from 'fs/promises';
import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import { basename } from 'path';
import spaceTrim from 'spacetrim';
import { getAllCommitmentsToolFunctionsForNode } from '../../commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { compilePipeline } from '../../conversion/compilePipeline';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { assertsError } from '../../errors/assertsError';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { jsonParse } from '../../formats/json/utils/jsonParse';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import { validatePipelineString } from '../../pipeline/validatePipelineString';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import { JavascriptExecutionTools } from '../../scripting/javascript/JavascriptExecutionTools';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $provideLlmToolsForCli } from '../common/$provideLlmToolsForCli';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `test` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeTestCommand(program: Program): $side_effect {
    const testCommand = program.command('test');
    testCommand.description(
        spaceTrim(`
            Iterates over \`.book.md\` and \`.bookc\` and checks if they are parsable and logically valid
      `),
    );

    testCommand.argument(
        '<filesGlob>',
        // <- TODO: [🧟‍♂️] Unite path to promptbook collection argument
        'Pipelines to test as glob pattern',
    );
    testCommand.option('-i, --ignore <glob>', `Ignore as glob patterns separated by comma`, '');

    testCommand.option('--no-validation', `Do not validate logic of pipelines in collection`, true);
    testCommand.option(
        '--no-prepare',
        `Do not prepare the pipelines, ideal when no LLM tools or scrapers available`,
        true,
    );

    testCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache `, false);

    testCommand.action(
        handleActionErrors(async (filesGlob, cliOptions) => {
            const {
                ignore: ignoreRaw = '',
                validation: isValidated,
                prepare: isPrepared,
                reload: isCacheReloaded,
                verbose: isVerbose,
            } = cliOptions;

            let tools: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers' | 'script'> | undefined = undefined;

            if (isPrepared) {
                // TODO: DRY [◽]
                const prepareAndScrapeOptions = {
                    isVerbose,
                    isCacheReloaded,
                }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
                const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
                const { llm } = await $provideLlmToolsForCli({ cliOptions, ...prepareAndScrapeOptions });
                const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
                tools = {
                    llm,
                    fs,
                    scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
                    script: [
                        new JavascriptExecutionTools({
                            ...prepareAndScrapeOptions,
                            functions: getAllCommitmentsToolFunctionsForNode(),
                        }),
                    ],
                } satisfies ExecutionTools;
            }

            const ignore = (ignoreRaw as string).split(',').map((pattern) => pattern.trim());

            const filenames = await glob(filesGlob!, { ignore });
            //                       <- TODO: [😶]

            // console.log({ filesGlob, ignore, filenames });
            // await forTime(1000000);

            pipelines: for (const filename of filenames) {
                try {
                    let pipeline: PipelineJson;

                    if (filename.endsWith('.book')) {
                        const pipelineMarkdown = validatePipelineString(await readFile(filename, 'utf-8'));
                        pipeline = await compilePipeline(pipelineMarkdown, tools);

                        if (isVerbose) {
                            console.info(colors.green(`Parsable ${filename}`));
                        }
                    }
                    if (filename.endsWith('.bookc')) {
                        pipeline = jsonParse(await readFile(filename, 'utf-8')) as PipelineJson;
                    } else {
                        if (isVerbose) {
                            console.info(colors.gray(`Skipping ${filename}`));
                        }
                        continue pipelines;
                    }

                    if (isValidated) {
                        validatePipeline(pipeline);
                        console.info(colors.green(`Validated ${filename}`));
                    }
                } catch (error) {
                    assertsError(error);

                    console.info(colors.red(`Pipeline is not valid ${filename}`));
                    console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
                    console.error(colors.red(error.stack || error.message));

                    return process.exit(1);
                }
            }

            console.info(colors.green(`All pipelines are valid`));
            return process.exit(0);
        }),
    );
}

/**
 * TODO: [😶] Unite folder listing
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 * Note: This is named "test-command.ts" to avoid name collision with jest unit test files
 */
