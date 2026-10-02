import type { ChildProcess } from 'child_process';
import { $terminateOwnedProcessTree } from '../../../../src/utils/execCommand/$terminateOwnedProcessTree';
import { PTBK_CODER_CANCEL_COMMAND } from './scriptExecutionLog';

/**
 * Whether the current coder process runs on Windows.
 */
const IS_WINDOWS = process.platform === 'win32';
/** Give the wrapper time to terminate its own MSYS job and flush logging before the native fallback. */
const WINDOWS_CANCELLATION_GRACE_MS = 2000;
/** Cancellation and marker-idle completion may race; never interrupt an orderly shutdown twice. */
const TERMINATING_PROCESSES = new WeakSet<ChildProcess>();

/**
 * Stops one active temporary Bash shell together with the harness process tree it owns.
 *
 * Unix sends `SIGTERM` to the wrapper so its shell trap terminates the separately grouped harness job. Windows does
 * not reliably deliver that signal to Bash, so the native `taskkill` command terminates the direct shell tree instead.
 *
 * @private internal utility of the coding prompt runner
 */
export function $terminateLoggedBashProcessTree(commandProcess: ChildProcess): void {
    if (
        commandProcess.exitCode !== null ||
        commandProcess.signalCode !== null ||
        TERMINATING_PROCESSES.has(commandProcess)
    ) {
        return;
    }
    TERMINATING_PROCESSES.add(commandProcess);

    if (!IS_WINDOWS) {
        commandProcess.kill('SIGTERM');
        return;
    }

    if (!commandProcess.pid) {
        return;
    }

    /** Native fallback also handles processes, such as planning inference, whose stdin is already closed. */
    const terminateNativeTree = (): void => {
        if (commandProcess.exitCode !== null || commandProcess.signalCode !== null || !commandProcess.pid) return;
        $terminateOwnedProcessTree(commandProcess);
    };
    if (commandProcess.stdin?.writable && !commandProcess.stdin.writableEnded) {
        commandProcess.stdin.once('error', terminateNativeTree);
        commandProcess.stdin.end(`${PTBK_CODER_CANCEL_COMMAND}\n`);
        const fallback = setTimeout(terminateNativeTree, WINDOWS_CANCELLATION_GRACE_MS);
        fallback.unref();
        commandProcess.once('close', () => clearTimeout(fallback));
    } else {
        terminateNativeTree();
    }
}
