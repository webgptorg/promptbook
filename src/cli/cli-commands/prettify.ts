import colors from 'colors';
import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import spaceTrim from 'spacetrim';
import { prettifyPipelineString } from '../../conversion/prettify/prettifyPipelineString';
import type { PipelineString } from '../../types/PipelineString';

/**
 * Initializes `prettify` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializePrettifyCommand(program: Program) {
    const prettifyCommand = program.command('prettify');
    prettifyCommand.description(
        spaceTrim(`
            Iterates over \`.ptbk.md\` files and does multiple enhancing operations on them:

            1) Adds Mermaid graph
            2) Prettifies the markdown
      `),
    );

    prettifyCommand.argument(
        '<filesGlob>',
        // <- TODO: [🧟‍♂️] Unite path to promptbook collection argument
        'Pipelines to prettify as glob pattern',
    );
    prettifyCommand.option('-i, --ignore <glob>', `Ignore as glob pattern`);
    prettifyCommand.option('-v, --verbose', `Is output verbose`, false);

    prettifyCommand.action(async (filesGlob, { ignore, verbose: isVerbose }) => {
        const filenames = await glob(filesGlob!, { ignore });
        //                       <- TODO: [😶]

        for (const filename of filenames) {
            if (!filename.endsWith('.ptbk.md') && isVerbose) {
                console.info(colors.gray(`Skipping ${filename}`));
                continue;
            }

            let pipelineMarkdown = (await readFile(filename, 'utf-8')) as PipelineString;

            try {
                pipelineMarkdown = await prettifyPipelineString(pipelineMarkdown, {
                    isGraphAdded: true,
                    isPrettifyed: true,
                    // <- [🕌]
                });

                await writeFile(filename, pipelineMarkdown);

                if (isVerbose) {
                    console.info(colors.green(`Prettify ${filename}`));
                }
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                console.info(colors.red(`Prettify ${error.name} ${filename}`));
                console.error(colors.bgRed(error.name /* <- 11:11 */));
                console.error(colors.red(error.stack || error.message));

                return process.exit(1);
            }
        }

        console.info(colors.green(`All pipelines are prettified`));
        return process.exit(0);
    });
}

/**
 * TODO: [😶] Unite floder listing
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 */
