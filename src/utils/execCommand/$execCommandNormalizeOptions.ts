import { DEFAULT_IS_VERBOSE } from '../../config';
import type { ExecCommandOptions } from './ExecCommandOptions';
import type { ExecCommandOptionsAdvanced } from './ExecCommandOptions';

/**
 * Normalize options for `execCommand` and `execCommands`
 *
 * Note: `$` is used to indicate that this function behaves differently according to `process.platform`
 *
 * @private internal utility of `execCommand` and `execCommands`
 */
export function $execCommandNormalizeOptions(options: ExecCommandOptions): Pick<
    ExecCommandOptionsAdvanced,
    'command' | 'args' | 'cwd' | 'crashOnError' | 'timeout' | 'isVerbose'
> & {
    humanReadableCommand: string;
} {
    let command: string;
    let cwd: string;
    let crashOnError: boolean;
    let args: string[] = [];
    let timeout: number;
    let isVerbose: boolean;

    if (typeof options === 'string') {
        // TODO: [1] DRY default values
        command = options;
        cwd = process.cwd();
        crashOnError = true;
        timeout = Infinity;
        isVerbose = DEFAULT_IS_VERBOSE;
    } else {
        /*
        TODO:
        if ((options as any).commands !== undefined) {
            commands = (options as any).commands;
        } else {
            commands = [(options as any).command];
        }
        */

        // TODO: [1] DRY default values
        command = options.command;
        cwd = options.cwd ?? process.cwd();
        crashOnError = options.crashOnError ?? true;
        timeout = options.timeout ?? Infinity;
        isVerbose = options.isVerbose ?? DEFAULT_IS_VERBOSE;
    }

    // TODO: /(-[a-zA-Z0-9-]+\s+[^\s]*)|[^\s]*/g
    const _ = Array.from(command.matchAll(/(".*")|([^\s]*)/g))
        .map(([match]) => match)
        .filter((arg) => arg !== '');

    if (_.length > 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [command, ...args] = _ as any;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((options as any).args) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args = [...args, ...(options as any).args];
    }

    let humanReadableCommand = !['npx', 'npm'].includes(command) ? command : args[0]!;
    if (['ts-node'].includes(humanReadableCommand)) {
        humanReadableCommand += ` ${args[1]}`;
    }

    if (/^win/.test(process.platform) && ['npm', 'npx'].includes(command)) {
        command = `${command}.cmd`;
    }

    return { command, humanReadableCommand, args, cwd, crashOnError, timeout, isVerbose };
}

// TODO: This should show type error> execCommandNormalizeOptions({ command: '', commands: [''] });
