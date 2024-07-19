import commander from 'commander';
import { spaceTrim } from 'spacetrim';
import { isRunningInNode } from '../utils/isRunningInWhatever';
import { PROMPTBOOK_VERSION } from '../version';
import { initializeHelloCommand } from './commands/hello';
import { initializeMakeCommand } from './commands/make';
import { initializePrettifyCommand } from './commands/prettify';

/**
 * Runs CLI utilities of Promptbook package
 */
export async function promptbookCli(): Promise<void> {
    if (!isRunningInNode()) {
        throw new Error(
            spaceTrim(`
                Function promptbookCli is initiator of CLI script and should be run in Node.js environment.

                - In browser use function exported from \`@promptbook/utils\` or  \`@promptbook/core\` directly, for example \`prettifyPipelineString\`.

            `),
        );
    }

    const program = new commander.Command();
    program.name('promptbook');
    program.version(PROMPTBOOK_VERSION);
    program.description(
        spaceTrim(`
            Promptbook utilities for enhancing workflow with promptbooks
        `),
    );

    initializeHelloCommand(program);
    initializeMakeCommand(program);
    initializePrettifyCommand(program);

    program.parse(process.argv);
}

/**
 * TODO: [🥠] Do not export to utils directly, its just for CLI script
 * TODO: [🕌] When more functionalities, rename
 * Note: 11:11
 */
