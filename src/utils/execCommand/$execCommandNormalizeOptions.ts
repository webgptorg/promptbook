import { DEFAULT_IS_VERBOSE } from '../../config';
import { TODO_any } from '../organization/TODO_any';
import type { ExecCommandOptions, ExecCommandOptionsAdvanced } from './ExecCommandOptions';

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
        timeout = Infinity; // <- TODO: [⏳]
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
        [command, ...args] = _ as TODO_any;
    }

    if ((options as TODO_any).args) {
        args = [...args, ...(options as TODO_any).args];
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
