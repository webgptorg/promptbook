import colors from 'colors';
import { formatUnknownErrorDetails } from '../../../../scripts/run-codex-prompts/common/formatUnknownErrorDetails';

/**
 * Prints why a coder run has ended to the terminal.
 *
 * @private internal utility of `coder run` and `coder server` commands
 */
export function printCoderRunFailure(error: Error): void {
    console.error(colors.bgRed(`${error.name}`));
    console.error(colors.red(formatUnknownErrorDetails(error)));
}

// Note: [🟡] Code for coder failure reporting [printCoderRunFailure](src/cli/cli-commands/coder/printCoderRunFailure.ts) should never be published outside of `@promptbook/cli`
