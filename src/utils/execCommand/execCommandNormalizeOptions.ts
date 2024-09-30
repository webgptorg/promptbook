import type { IExecCommandOptions } from './IExecCommandOptions';
import type { IExecCommandOptionsAdvanced } from './IExecCommandOptions';

/**
 * Normalize options for `execCommand` and `execCommands`
 *
 * @private internal utility of `execCommand` and `execCommands`
 */
export function execCommandNormalizeOptions(options: IExecCommandOptions): Pick<
    IExecCommandOptionsAdvanced,
    'command' | 'args' | 'cwd' | 'crashOnError' | 'timeout'
> & {
    humanReadableCommand: string;
} {
    let command: string;
    let cwd: string;
    let crashOnError: boolean;
    let args: string[] = [];
    let timeout: number;

    if (typeof options === 'string') {
        // TODO: [1] DRY default values
        command = options;
        cwd = process.cwd();
        crashOnError = true;
        timeout = Infinity;
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

    return { command, humanReadableCommand, args, cwd, crashOnError, timeout };
}

// TODO: This should show type error> execCommandNormalizeOptions({ command: '', commands: [''] });
