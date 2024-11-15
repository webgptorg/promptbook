import colors from 'colors';
import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import spaceTrim from 'spacetrim';
import { CLAIM } from '../../config';
import { BOOK_LANGUAGE_VERSION } from '../../version';
import { PROMPTBOOK_ENGINE_VERSION } from '../../version';

/**
 * Initializes `about` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializeAboutCommand(program: Program) {
    const makeCommand = program.command('about');
    makeCommand.description(
        spaceTrim(`
            Tells about Promptbook CLI and its abilities
      `),
    );

    makeCommand.action(async () => {
        console.info(colors.bold(colors.cyan(`Promptbook: ${CLAIM}`)));
        console.info(colors.cyan(`Book language version: ${BOOK_LANGUAGE_VERSION}`));
        console.info(colors.cyan(`Promptbook engine version: ${PROMPTBOOK_ENGINE_VERSION}`));
        console.info(colors.cyan(`https://github.com/webgptorg/promptbook`));
        console.info(colors.cyan(`https://ptbk.io`));
        return process.exit(0);
    });
}

/**
 * TODO: [🗽] Unite branding and make single place for it
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
