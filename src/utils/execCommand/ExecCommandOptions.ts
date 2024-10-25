/**
 * @deprecated Use sth from type-fest or move this to type helpers
 */
type RequiredAndOptional<TBase, TRequired extends keyof TBase, TOptional extends keyof TBase> = Pick<TBase, TRequired> &
    Partial<Pick<TBase, TOptional>>;

/**
 * Simple options for `execCommand`
 *
 * TODO: !!!!!! Rename - remove I prefix
 */
export type ExecCommandOptions =
    | string
    | RequiredAndOptional<ExecCommandOptionsAdvanced, 'command', 'args' | 'cwd' | 'crashOnError' | 'timeout'>;
// TODO: | RequiredAndOptional<IExecCommandOptionsAdvanced, 'commands', 'args' | 'cwd' | 'crashOnError'>;

/**
 * Advanced options for `execCommand`
 *
 * TODO:  !!!!!! Rename - remove I prefix
 */
export type ExecCommandOptionsAdvanced = {
    readonly command: string;
    readonly args: string[];
    // TODO: readonly commands: {command: string, args?: string[]}[];
    readonly cwd: string;
    readonly crashOnError: boolean;
    readonly timeout: number;
};
