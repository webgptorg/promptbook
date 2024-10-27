import colors from 'colors';
import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import { readFile } from 'fs/promises';
import glob from 'glob-promise';
import spaceTrim from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { $provideLlmToolsForCli } from '../../llm-providers/_common/register/$provideLlmToolsForCli';
import { $provideExecutablesForNode } from '../../scrapers/_common/register/$provideExecutablesForNode';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../../types/PipelineString';

/**
 * Initializes `test` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializeTestCommand(program: Program) {
    const testCommand = program.command('test');
    testCommand.description(
        spaceTrim(`
            Iterates over \`.ptbk.md\` and \`.ptbk.json\` and checks if they are parsable and logically valid
      `),
    );

    testCommand.argument(
        '<filesGlob>',
        // <- TODO: [🧟‍♂️] Unite path to promptbook collection argument
        'Pipelines to test as glob pattern',
    );
    testCommand.option('-i, --ignore <glob>', `Ignore as glob pattern`);
    testCommand.option('--reload', `Call LLM models even if same prompt with result is in the cache `, false);
    testCommand.option('-v, --verbose', `Is output verbose`, false);

    testCommand.action(async (filesGlob, { ignore, reloadCache: isReloaded, verbose: isVerbose }) => {
        // TODO: DRY [◽]
        const options = {
            isVerbose,
            isReloaded,
        }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
        const fs = $provideFilesystemForNode(options);
        const llm = $provideLlmToolsForCli(options);
        const executables = await $provideExecutablesForNode(options);
        const tools = {
            llm,
            fs,
            scrapers: await $provideScrapersForNode({ fs, llm, executables }, options),
            script: [
                /*new JavascriptExecutionTools(options)*/
            ],
        } satisfies ExecutionTools;

        const filenames = await glob(filesGlob!, { ignore });
        //                       <- TODO: [😶]

        pipelines: for (const filename of filenames) {
            try {
                let pipeline: PipelineJson;

                if (filename.endsWith('.ptbk.md')) {
                    const pipelineMarkdown = (await readFile(filename, 'utf-8')) as PipelineString;
                    pipeline = await pipelineStringToJson(pipelineMarkdown, tools);

                    if (isVerbose) {
                        console.info(colors.green(`Parsed ${filename}`));
                    }
                }
                if (filename.endsWith('.ptbk.json')) {
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

                process.exit(1);
            }
        }

        console.info(colors.green(`All pipelines are valid`));
        process.exit(0);
    });
}

/**
 * TODO: [😶] Unite floder listing
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 * Note: This is named "test-command.ts" to avoid name collision with jest unit test files
 */
