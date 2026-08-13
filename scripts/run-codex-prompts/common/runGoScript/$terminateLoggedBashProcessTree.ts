import { spawnSync, type ChildProcess } from 'child_process';

/**
 * Whether the current coder process runs on Windows.
 */
const IS_WINDOWS = process.platform === 'win32';

/**
 * Stops one active temporary Bash shell together with the harness process tree it owns.
 *
 * Unix sends `SIGTERM` to the wrapper so its shell trap terminates the separately grouped harness job. Windows does
 * not reliably deliver that signal to Bash, so the native `taskkill` command terminates the direct shell tree instead.
 *
 * @private internal utility of the coding prompt runner
 */
export function $terminateLoggedBashProcessTree(commandProcess: ChildProcess): void {
    if (commandProcess.exitCode !== null || commandProcess.signalCode !== null) {
        return;
    }

    if (!IS_WINDOWS) {
        commandProcess.kill('SIGTERM');
        return;
    }

    if (!commandProcess.pid) {
        return;
    }

    spawnSync('taskkill.exe', ['/PID', commandProcess.pid.toString(), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
    });
}
