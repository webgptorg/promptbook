/**
 * @deprecated Use sth from type-fest or move this to type helpers
 */
type RequiredAndOptional<TBase, TRequired extends keyof TBase, TOptional extends keyof TBase> = Pick<TBase, TRequired> &
    Partial<Pick<TBase, TOptional>>;

/**
 * Simple options for `execCommand`
 */
export type ExecCommandOptions =
    | string
    | RequiredAndOptional<
          ExecCommandOptionsAdvanced,
          'command',
          'args' | 'cwd' | 'crashOnError' | 'timeout' | 'isVerbose'
      >;
// TODO: | RequiredAndOptional<IExecCommandOptionsAdvanced, 'commands', 'args' | 'cwd' | 'crashOnError'>;

/**
 * Advanced options for `execCommand`
 */
export type ExecCommandOptionsAdvanced = {
    /**
     * Command to run
     */
    readonly command: string;

    /**
     * Arguments for the command
     */
    readonly args: string[];

    /**
     * Current working directory
     *
     * @default process.cwd()
     */
    readonly cwd: string;

    /**
     * If `true` then the command will throw an error if the return code is not `0`
     */
    readonly crashOnError: boolean;

    /**
     * Timeout in milliseconds
     */
    readonly timeout: number;

    /**
     * If `true` then the command and entire CLI output will be logged to the console
     *
     * @default false
     */
    readonly isVerbose?: boolean;
};

/**
 * TODO: Make DEFAULT_TIMEOUT_MS as global constant
 */
