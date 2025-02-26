import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { readFile } from 'fs/promises';
import glob from 'glob-promise';
import spaceTrim from 'spacetrim';
import { compilePipeline } from '../../conversion/compilePipeline';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { $provideLlmToolsForWizzardOrCli } from '../../llm-providers/_common/register/$provideLlmToolsForWizzardOrCli';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import { validatePipelineString } from '../../pipeline/validatePipelineString';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';

/**
 * Initializes `test` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeTestCommand(program: Program) {
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
    testCommand.option('-i, --ignore <glob>', `Ignore as glob pattern`);
    testCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache `, false);
    testCommand.option('-v, --verbose', `Is output verbose`, false);

    testCommand.action(async (filesGlob, { ignore, reload: isCacheReloaded, verbose: isVerbose }) => {
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

        const filenames = await glob(filesGlob!, { ignore });
        //                       <- TODO: [😶]

        pipelines: for (const filename of filenames) {
            try {
                let pipeline: PipelineJson;

                if (filename.endsWith('.book')) {
                    const pipelineMarkdown = validatePipelineString(await readFile(filename, 'utf-8'));
                    pipeline = await compilePipeline(pipelineMarkdown, tools);

                    if (isVerbose) {
                        console.info(colors.green(`Parsed ${filename}`));
                    }
                }
                if (filename.endsWith('.bookc')) {
                    pipeline = JSON.parse(await readFile(filename, 'utf-8')) as PipelineJson;
                } else {
                    if (isVerbose) {
                        console.info(colors.gray(`Skipping ${filename}`));
                    }
                    continue pipelines;
                }

                validatePipeline(pipeline);
                console.info(colors.green(`Validated ${filename}`));
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                console.info(colors.red(`Pipeline is not valid ${filename}`));
                console.error(colors.bgRed(error.name /* <- 11:11 */));
                console.error(colors.red(error.stack || error.message));

                return process.exit(1);
            }
        }

        console.info(colors.green(`All pipelines are valid`));
        return process.exit(0);
    });
}

/**
 * TODO: [😶] Unite floder listing
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 * Note: This is named "test-command.ts" to avoid name collision with jest unit test files
 */
