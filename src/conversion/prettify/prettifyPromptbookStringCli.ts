import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import spaceTrim from 'spacetrim';
import { PromptbookString } from '../../types/PromptbookString';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { PROMPTBOOK_VERSION } from '../../version';
import { prettifyPromptbookString } from './prettifyPromptbookString';

/**
 * !!! Initialize
 */
export async function prettifyPromptbookStringCli(): Promise<void> {
    if (!isRunningInNode()) {
        throw new Error(
            spaceTrim(`
                Function prettifyPromptbookStringCli is initiator of CLI script and should be run in Node.js environment.

                - In browser use prettifyPromptbookString.

            `),
        );
    }

    const program = new commander.Command();
    program.version(PROMPTBOOK_VERSION);
    program.argument('<filesGlob>', 'Promptbooks to prettify');
    program.parse(process.argv);

    const { filesGlob } = program.options;

    const filePaths = await glob(filesGlob);

    for (const filePath of filePaths) {
        if (!filePath.endsWith('.ptbk.md')) {
            console.warn(colors.yellow(`Skipping prettify of non-promptbook ${filePath}`));
            continue;
        }

        let promptbookMarkdown = (await readFile(filePath, 'utf-8')) as PromptbookString;

        try {
            promptbookMarkdown = prettifyPromptbookString(promptbookMarkdown, {
                isGraphAdded: true,
                isPrettifyed: true,
                // <- [🕌]
            });

            await writeFile(filePath, promptbookMarkdown);

            console.info(colors.america(`Prettify ${filePath}`));
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.info(colors.bgWhite('========================='));
            console.info(colors.red(`Prettify error ${filePath}`));
            console.error(colors.bgRed(error.name));
            console.error(error);
            console.info(colors.bgWhite('========================='));
        }
    }
}

/**
 * TODO: [🥠] Do not export to utils directly, its just for CLI script
 * TODO: [🌰] Use just prettifyPromptbookStringCli
 * Note: 11:11
 */
