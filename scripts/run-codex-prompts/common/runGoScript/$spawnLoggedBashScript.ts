import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { buildLoggedBashExecution, PTBK_CODER_PARENT_PROCESS_ID_ENV_NAME } from './scriptExecutionLog';

/**
 * Standard streams used by every temporary Bash runner.
 */
const BASH_PROCESS_STDIO: ['pipe', 'pipe', 'pipe'] = ['pipe', 'pipe', 'pipe'];

/**
 * Whether the current Node process is running on Windows.
 */
const IS_WINDOWS = process.platform === 'win32';

/**
 * Input used to start one temporary logged Bash script.
 *
 * @private internal type of `$spawnLoggedBashScript`
 */
type SpawnLoggedBashScriptOptions = {
    readonly scriptPath: string;
    readonly logPath?: string;

    /**
     * Process which owns the temporary harness shell. Defaults to the current coder process.
     */
    readonly parentProcessId?: number;
};

/**
 * Starts one temporary Bash script in a process tree owned by the current Node process.
 *
 * The wrapper watches the supplied owning process ID. When that process exits abruptly, the wrapper terminates every
 * nested shell and harness process instead of leaving it orphaned.
 *
 * @private internal utility of the coding prompt runner
 */
export function $spawnLoggedBashScript(options: SpawnLoggedBashScriptOptions): ChildProcessWithoutNullStreams {
    const bashExecution = buildLoggedBashExecution(options.scriptPath, options.logPath);
    const parentProcessId = options.parentProcessId ?? process.pid;

    return spawn('bash', bashExecution.args, {
        detached: !IS_WINDOWS,
        env: {
            ...process.env,
            ...bashExecution.env,
            [PTBK_CODER_PARENT_PROCESS_ID_ENV_NAME]: parentProcessId.toString(),
        },
        stdio: BASH_PROCESS_STDIO,
        windowsHide: true,
    });
}
