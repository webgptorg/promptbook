import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { CLAIM } from '../../config';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import { BOOK_LANGUAGE_VERSION } from '../../version';
import { PROMPTBOOK_ENGINE_VERSION } from '../../version';
import { handleActionErrors } from './common/handleActionErrors';
import { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Initializes `about` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAboutCommand(program: Program): $side_effect {
    const makeCommand = program.command('about');
    makeCommand.description(
        spaceTrim(`
            Tells about Promptbook CLI and its abilities
        `),
    );

    makeCommand.action(
        handleActionErrors(async () => {
            console.info(colors.bold(colors.blue(`Promptbook: ${CLAIM}`)));
            console.info(colors.cyan(`Book language version: ${BOOK_LANGUAGE_VERSION}`));
            console.info(colors.cyan(`Promptbook engine version: ${PROMPTBOOK_ENGINE_VERSION}`));

            if ($isRunningInNode()) {
                console.info(colors.cyan(`Environment: Node.js`));
                console.info(colors.cyan(`Node.js version: ${process.version}`));
                // <- TODO: [🧠][🎺] Make robust system to check platform requirements like browser/node environment, version of node, available memory, disk space, ...
                console.info(colors.cyan(`Platform type: ${process.platform}`));
                console.info(colors.cyan(`Platform architecture: ${process.arch}`));
                // console.info(colors.cyan(`Available memory: ${process.availableMemory()}`));
                // <- TODO: [🧠] Should we show available memory / disk / ...
            } else if ($isRunningInJest()) {
                console.info(colors.cyan(`Environment: Jest (testing)`));
            } else if ($isRunningInBrowser()) {
                // <- Note: This is unreliable because CLI itself is not running in browser but for future use
                console.info(colors.cyan(`Environment: Browser`));
            } else if ($isRunningInWebWorker()) {
                // <- Note: This is unreliable because CLI itself is not running in browser but for future use
                console.info(colors.cyan(`Environment: Web Worker`));
            }

            console.info(colors.gray(`https://github.com/webgptorg/promptbook`));
            console.info(colors.gray(`https://ptbk.io`));

            return process.exit(0);
        }),
    );
}

/**
 * TODO: [🗽] Unite branding and make single place for it
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
