import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import type { PromptbookString } from './../../types/PromptbookString';
import { isRunningInNode } from './../../utils/isRunningInWhatever';
import { PROMPTBOOK_VERSION } from './../../version';
import { prettifyPromptbookString } from './prettifyPromptbookString';

/**
 * Runs CLI script for prettifying promptbooks
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
    program.name('promptbook');
    program.version(PROMPTBOOK_VERSION);
    program.description(
        spaceTrim(`
            Promptbook utilities
        `),
    );

    //------

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

            let promptbookMarkdown = (await readFile(filePath, 'utf-8')) as PromptbookString;

            try {
                promptbookMarkdown = prettifyPromptbookString(promptbookMarkdown, {
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

    //------

    const helloCommand = program.command('hello');
    helloCommand.description(
        spaceTrim(`
            Just command for testing
        `),
    );

    helloCommand.argument('<name>', 'Your name');
    helloCommand.option('-g, --greeting <greeting>', `Greeting`, 'Hello');

    helloCommand.action(async (name, { greeting }) => {
        console.info(colors.cyan(`${greeting} ${name}`));
        await forTime(1000);
        console.info(colors.rainbow(`Nice to meet you!`));
        process.exit(0);
    });

    //------
    program.parse(process.argv);
}

/**
 * TODO: [🥠] Do not export to utils directly, its just for CLI script
 * TODO: [🕌] When more functionalities, rename
 * Note: 11:11
 */
