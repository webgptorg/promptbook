import { IExecCommandOptions, IExecCommandOptionsAdvanced } from './IExecCommandOptions';

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
        [command, ...args] = _ as any;
    }

    if ((options as any).args) {
        args = [...args, ...(options as any).args];
    }

    for (const arg of args) {
    }

    let humanReadableCommand = !['npx', 'npm'].includes(command) ? command : args[0]!;
    if (['ts-node'].includes(humanReadableCommand)) {
        humanReadableCommand += ` ${args[1]}`;
    }

    return { command, humanReadableCommand, args, cwd, crashOnError, timeout };
}

// TODO: This should show type error> execCommandNormalizeOptions({ command: '', commands: [''] });
