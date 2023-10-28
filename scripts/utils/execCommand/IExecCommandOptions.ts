type RequiredAndOptional<TBase, TRequired extends keyof TBase, TOptional extends keyof TBase> = Pick<TBase, TRequired> &
    Partial<Pick<TBase, TOptional>>;

export type IExecCommandOptions =
    | string
    | RequiredAndOptional<IExecCommandOptionsAdvanced, 'command', 'args' | 'cwd' | 'crashOnError' | 'timeout'>;
// TODO: | RequiredAndOptional<IExecCommandOptionsAdvanced, 'commands', 'args' | 'cwd' | 'crashOnError'>;

export interface IExecCommandOptionsAdvanced {
    readonly command: string;
    readonly args: string[];
    // TODO: readonly commands: {command: string, args?: string[]}[];
    readonly cwd: string;
    readonly crashOnError: boolean;
    readonly timeout: number;
}
