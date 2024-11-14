import commander from 'commander';
import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
import { initializeAboutCommand } from './cli-commands/about';
import { initializeHelloCommand } from './cli-commands/hello';
import { initializeMakeCommand } from './cli-commands/make';
import { initializePrettifyCommand } from './cli-commands/prettify';
import { initializeTestCommand } from './cli-commands/test-command';

/**
 * Runs CLI utilities of Promptbook package
 *
 * @private within the `@promptbook/cli`
 */
export async function promptbookCli(): Promise<void> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Function promptbookCli is initiator of CLI script and should be run in Node.js environment.

                - In browser use function exported from \`@promptbook/utils\` or  \`@promptbook/core\` directly, for example \`prettifyPipelineString\`.

            `),
        );
    }

    const program = new commander.Command();
    program.name('promptbook');
    program.alias('ptbk');

    program.version(PROMPTBOOK_ENGINE_VERSION);
    program.description(
        spaceTrim(`
            Promptbook utilities for enhancing workflow with promptbooks
        `),
    );

    initializeAboutCommand(program);
    initializeHelloCommand(program);
    initializeMakeCommand(program);
    initializePrettifyCommand(program);
    initializeTestCommand(program);

    program.parse(process.argv);
}

/**
 * TODO: [🥠] Do not export, its just for CLI script
 * TODO: [🕌] When more functionalities, rename
 * Note: 11:11
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
