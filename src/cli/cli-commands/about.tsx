import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { render, Text } from 'ink';
import React from 'react';
import spaceTrim from 'spacetrim';
import { CLAIM } from '../../config';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';

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
        console.info(colors.bold(colors.cyan(`Promptbook: ${CLAIM}`)));
        console.info(colors.cyan(`Book language version: ${BOOK_LANGUAGE_VERSION}`));
        console.info(colors.cyan(`Promptbook engine version: ${PROMPTBOOK_ENGINE_VERSION}`));
        console.info(colors.cyan(`https://github.com/webgptorg/promptbook`));
        console.info(colors.cyan(`https://ptbk.io`));
        return process.exit(0);
    });
}

/**
 * TODO: !!!!!! Use or uninstall `ink-table` and `ink-use-stdout-dimensions`
 * TODO: [🗽] Unite branding and make single place for it
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
