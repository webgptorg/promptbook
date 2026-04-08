import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import { basename } from 'path';
import { spaceTrim } from 'spacetrim';
import { prettifyPipelineString } from '../../conversion/prettify/prettifyPipelineString';
import { assertsError } from '../../errors/assertsError';
import { validatePipelineString } from '../../pipeline/validatePipelineString';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `prettify` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializePrettifyCommand(program: Program): $side_effect {
    const prettifyCommand = program.command('prettify');
    prettifyCommand.description(
        spaceTrim(`
            Iterates over \`.book.md\` files and does multiple enhancing operations on them:

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

    prettifyCommand.action(
        handleActionErrors(async (filesGlob, cliOptions) => {
            const { ignore, verbose: isVerbose } = cliOptions;
            const filenames = await glob(filesGlob!, { ignore });
            //                       <- TODO: [😶]

            for (const filename of filenames) {
                if (!filename.endsWith('.book') && isVerbose) {
                    console.info(colors.gray(`Skipping ${filename}`));
                    continue;
                }

                let pipelineMarkdown = validatePipelineString(await readFile(filename, 'utf-8'));

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
                    assertsError(error);

                    console.info(colors.red(`Prettify ${error.name} ${filename}`));
                    console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
                    console.error(colors.red(error.stack || error.message));

                    return process.exit(1);
                }
            }

            console.info(colors.green(`All pipelines are prettified`));
            return process.exit(0);
        }),
    );
}

/** Note: [🟡] Code for CLI command [prettify](src/cli/cli-commands/prettify.ts) should never be published outside of `@promptbook/cli` */
/**
 * TODO: [😶] Unite folder listing
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 */
