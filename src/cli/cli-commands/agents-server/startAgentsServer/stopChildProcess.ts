import type { ChildProcess } from 'child_process';

/**
 * Stops only the child process spawned for the local Next server.
 *
 * @private internal utility of `startAgentsServer`
 */
export function stopChildProcess(commandProcess: ChildProcess | undefined): void {
    if (!commandProcess || commandProcess.killed) {
        return;
    }

    commandProcess.kill();
}
