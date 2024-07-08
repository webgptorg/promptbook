import colors from 'colors';
import type { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import spaceTrim from 'spacetrim';
import { prettifyPipelineString } from '../../conversion/prettify/prettifyPipelineString';
import type { PipelineString } from '../../types/PipelineString';

/**
 * Initializes `prettify` command for Promptbook CLI utilities
 *
 * @private part of `promptbookCli`
 */
export function initializePrettify(program: Command) {
    const prettifyCommand = program.command('prettify');
    prettifyCommand.description(
        spaceTrim(`
            Iterates over promptbooks and does multiple enhancing operations on them:

            1) Adds Mermaid graph
            2) Prettifies the markdown
      `),
    );

    prettifyCommand.argument('<filesGlob>', 'Promptbooks to prettify as glob pattern');
    prettifyCommand.option('-i, --ignore <glob>', `Ignore as glob pattern`);

    prettifyCommand.action(async (filesGlob, { ignore }) => {
        const filePaths = await glob(filesGlob!, { ignore });

        for (const filePath of filePaths) {
            if (!filePath.endsWith('.ptbk.md')) {
                console.warn(colors.yellow(`Skipping prettify of non-promptbook ${filePath}`));
                continue;
            }

            let promptbookMarkdown = (await readFile(filePath, 'utf-8')) as PipelineString;

            try {
                promptbookMarkdown = await prettifyPipelineString(promptbookMarkdown, {
                    isGraphAdded: true,
                    isPrettifyed: true,
                    // <- [🕌]
                });

                await writeFile(filePath, promptbookMarkdown);

                console.info(colors.green(`Prettify ${filePath}`));
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                console.info(colors.red(`Prettify ${error.name} ${filePath}`));
                console.error(colors.bgRed(error.name));
                console.error(error);

                process.exit(1);
            }
        }
        process.exit(0);
    });
}
