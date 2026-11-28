import type { $side_effect } from '../organization/$side_effect';
import { $execCommand } from './$execCommand';

/**
 * Run multiple commands in a shell in sequence
 *
 * Note: There are 2 similar functions in the codebase:
 * - `$execCommand` which runs a single command
 * - `$execCommands` which runs multiple commands
 * Note: `$` is used to indicate that this function is not a pure function - it runs a commands in a shell
 *
 * @public exported from `@promptbook/node`
 */
export async function $execCommands({
    commands,
    cwd,
    crashOnError,
}: $side_effect & {
    readonly commands: string[];
    readonly cwd: string;
    readonly crashOnError?: boolean;
}) {
    for (const command of commands) {
        await $execCommand({ command, cwd, crashOnError });
    }
}

// Note: [🟢] Code for Node command-execution helper [$execCommands](src/utils/execCommand/$execCommands.ts) should never be published into packages that could be imported into browser environment
