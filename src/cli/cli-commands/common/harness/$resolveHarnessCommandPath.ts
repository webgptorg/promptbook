import { realpath } from 'fs/promises';
import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import type { HarnessDefinition } from './HarnessDefinition';

/**
 * Time limit for looking up where the harness command lives.
 */
const HARNESS_COMMAND_LOOKUP_TIMEOUT_MS = 30 * 1000;

/**
 * Finds out which file is really executed when the harness command runs.
 *
 * The lookup deliberately uses the very same `PATH` which runs the harness, so it reports the copy of the
 * harness which Promptbook itself would use. Symbolic links are followed, because installers like the
 * standalone OpenAI Codex installer only link their package into a directory on `PATH`.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it runs a command in a shell
 *
 * @returns Resolved path of the harness command or `null` when the command is not available
 * @private internal utility of `promptbookCli`
 */
export async function $resolveHarnessCommandPath(definition: HarnessDefinition): Promise<string | null> {
    const lookupCommand =
        process.platform === 'win32' ? `where ${definition.commandName}` : `command -v ${definition.commandName}`;

    const output: string = await $execCommand({
        command: lookupCommand,
        crashOnError: true,
        timeout: HARNESS_COMMAND_LOOKUP_TIMEOUT_MS,
        isVerbose: false,
    }).catch(() => '');

    // Note: `where` lists every match on its own line, only the first one is really executed
    const commandPath = output
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line !== '');

    if (commandPath === undefined) {
        return null;
    }

    return await realpath(commandPath).catch(() => commandPath);
}

// Note: [🟡] Code for CLI harness command lookup [$resolveHarnessCommandPath](src/cli/cli-commands/common/harness/$resolveHarnessCommandPath.ts) should never be published outside of `@promptbook/cli`
