import colors from 'colors';
import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import { readFile } from 'fs/promises';
import glob from 'glob-promise';
import spaceTrim from 'spacetrim';
import { validatePipeline } from '../../_packages/core.index';
import { PipelineJson } from '../../_packages/types.index';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import type { PipelineString } from '../../types/PipelineString';

/**
 * Initializes `test` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializeTestCommand(program: Program) {
    const prettifyCommand = program.command('prettify');
    prettifyCommand.description(
        spaceTrim(`
            Iterates over \`.ptbk.md\` and \`.ptbk.json\` and checks if they are parsable and logically valid
      `),
    );

    prettifyCommand.argument(
        '<filesGlob>',
        // <- TODO: [🧟‍♂️] Unite path to promptbook collection argument
        'Promptbooks to prettify as glob pattern',
    );
    prettifyCommand.option('-i, --ignore <glob>', `Ignore as glob pattern`);
    prettifyCommand.option('-v, --verbose', `Is output verbose`, false);

    prettifyCommand.action(async (filesGlob, { ignore, verbose: isVerbose }) => {
        const filenames = await glob(filesGlob!, { ignore });
        //                       <- TODO: [😶]

        pipelines: for (const filename of filenames) {
            try {
                let pipeline: PipelineJson;

                if (filename.endsWith('.ptbk.md')) {
                    const pipelineMarkdown = (await readFile(filename, 'utf-8')) as PipelineString;
                    pipeline = await pipelineStringToJson(pipelineMarkdown);

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
 */
