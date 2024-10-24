import { $execCommand } from './$execCommand';

/**
 * Run multiple commands in a shell in sequence
 *
 * Note: There are 2 similar functions in the codebase:
 * - `$execCommand` which runs a single command
 * - `$execCommands` which runs multiple commands
 *
 * @public exported from `@promptbook/node`
 */
export async function $execCommands({
    commands,
    cwd,
    crashOnError,
}: {
    readonly commands: string[];
    readonly cwd: string;
    readonly crashOnError?: boolean;
}) {
    for (const command of commands) {
        await $execCommand({ command, cwd, crashOnError });
    }
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
