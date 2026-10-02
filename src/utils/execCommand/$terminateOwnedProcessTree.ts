import { spawnSync, type ChildProcess } from 'child_process';

// cspell:ignore taskkill

/**
 * Terminates only an owned child and, when explicitly created separately, its dedicated process group.
 * Windows targets the exact owned PID and descendants; it never selects processes by executable name.
 * @private shared lifecycle of CLI subprocesses
 */
export function $terminateOwnedProcessTree(commandProcess: ChildProcess, isDedicatedProcessGroup = false): void {
    if (!commandProcess.pid || commandProcess.exitCode !== null || commandProcess.signalCode !== null) return;
    if (process.platform === 'win32') {
        spawnSync('taskkill.exe', ['/PID', String(commandProcess.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
        });
        return;
    }
    if (isDedicatedProcessGroup) {
        try {
            process.kill(-commandProcess.pid, 'SIGKILL');
            return;
        } catch {
            // The process may have exited between the ownership check and signal delivery.
        }
    }
    commandProcess.kill('SIGKILL');
}

// Note: [🟢] Owned subprocess termination is never published into browser packages.
