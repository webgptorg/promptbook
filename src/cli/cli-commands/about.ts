import colors from 'colors';
import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import spaceTrim from 'spacetrim';
import { CLAIM } from '../../config';
import { PROMPTBOOK_VERSION } from '../../version';

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
        console.info(colors.cyan(`Promptbook`));
        console.info(colors.cyan(CLAIM));
        console.info(colors.cyan(`Version: ${PROMPTBOOK_VERSION}`));
        console.info(colors.cyan(`https://ptbk.io`));
        process.exit(0);
    });
}

/**
 * TODO: [🗽] Unite branding and make single place for it
 * Note: [🟡] This code should never be published outside of `@promptbook/cli`
 */
