import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import { render, Text } from 'ink';
import React from 'react';
import spaceTrim from 'spacetrim';

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
        render(<Text>!!!!!!</Text>);

        /*
        console.info(colors.cyan(`Promptbook`));
        console.info(colors.cyan(CLAIM));
        console.info(colors.cyan(`Version: ${PROMPTBOOK_VERSION}`));
        console.info(colors.cyan(`https://ptbk.io`));
        */
        process.exit(0);
    });
}

/**
 * TODO: !!!!!! Use or uninstall `ink-table` and `ink-use-stdout-dimensions`
 * TODO: [🗽] Unite branding and make single place for it
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
