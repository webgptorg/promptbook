import { spawn } from 'child_process';
import type { RunScriptUntilMarkerIdleOptions } from './RunScriptUntilMarkerIdleOptions';
import { toPosixPath } from './toPosixPath';

/**
 * Runs a script until a completion marker is observed and output is idle for a set timeout.
 * Returns the captured output.
 */
export async function runScriptUntilMarkerIdle(options: RunScriptUntilMarkerIdleOptions): Promise<string> {
    const { scriptPath, completionLineMatcher, idleTimeoutMs } = options;
    const scriptPathPosix = toPosixPath(scriptPath);

    return await new Promise<string>((resolve, reject) => {
        const commandProcess = spawn('bash', [scriptPathPosix], { env: process.env });
        let stdoutBuffer = '';
        let stderrBuffer = '';
        let fullOutput = '';
        let markerSeen = false;
        let idleTimer: NodeJS.Timeout | undefined;
        let settled = false;

        /**
         * Ensures the promise settles only once.
         */
        const settleOnce = (handler: () => void): void => {
            if (settled) {
                return;
            }
            settled = true;
            if (idleTimer) {
                clearTimeout(idleTimer);
                idleTimer = undefined;
            }
            handler();
        };

        /**
         * Resets the idle timer that triggers termination after inactivity.
         */
        const scheduleIdleExit = (): void => {
            if (idleTimer) {
                clearTimeout(idleTimer);
            }
            idleTimer = setTimeout(() => {
                commandProcess.kill();
                settleOnce(() => resolve(fullOutput));
            }, idleTimeoutMs);
        };

        /**
         * Processes completed output lines to detect completion markers.
         */
        const handleLines = (lines: string[]): void => {
            for (const line of lines) {
                if (completionLineMatcher.test(line)) {
                    markerSeen = true;
                    scheduleIdleExit();
                    continue;
                }
                if (markerSeen) {
                    scheduleIdleExit();
                }
            }
        };

        /**
         * Handles output chunks from stdout or stderr.
         */
        const handleChunk = (chunk: string, source: 'stdout' | 'stderr'): void => {
            fullOutput += chunk;
            if (source === 'stderr') {
                if (chunk.trim()) {
                    console.warn(chunk);
                }
            } else {
                console.info(chunk);
            }

            if (source === 'stdout') {
                stdoutBuffer += chunk;
                const lines = stdoutBuffer.split(/\r?\n/);
                stdoutBuffer = lines.pop() ?? '';
                handleLines(lines);
            } else {
                stderrBuffer += chunk;
                const lines = stderrBuffer.split(/\r?\n/);
                stderrBuffer = lines.pop() ?? '';
                handleLines(lines);
            }

            if (markerSeen && chunk.length > 0) {
                scheduleIdleExit();
            }
        };

        commandProcess.stdout.on('data', (data) => handleChunk(data.toString(), 'stdout'));
        commandProcess.stderr.on('data', (data) => handleChunk(data.toString(), 'stderr'));

        /**
         * Handles process exit and resolves or rejects accordingly.
         */
        const handleExit = (code: number | null): void => {
            settleOnce(() => {
                if (code === 0 || markerSeen) {
                    resolve(fullOutput);
                    return;
                }
                reject(new Error(`Command "bash ${scriptPathPosix}" exited with code ${code ?? 'unknown'}`));
            });
        };

        commandProcess.on('close', handleExit);
        commandProcess.on('exit', handleExit);
        commandProcess.on('disconnect', () => {
            settleOnce(() => {
                reject(new Error(`Command "bash ${scriptPathPosix}" disconnected`));
            });
        });
        commandProcess.on('error', (error) => {
            settleOnce(() => {
                reject(new Error(`Command "bash ${scriptPathPosix}" failed: ${error.message}`));
            });
        });
    });
}
