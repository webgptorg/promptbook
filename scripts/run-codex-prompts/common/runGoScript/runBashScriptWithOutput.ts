import { spawn } from 'child_process';
import { spaceTrim } from 'spacetrim';
import type { RunGoScriptOptions } from './RunGoScriptOptions';
import {
    appendScriptExecutionLogFinish,
    appendScriptExecutionLogStart,
    buildLoggedBashExecution,
} from './scriptExecutionLog';
import { toPosixPath } from './toPosixPath';

/**
 * Runs one temporary bash script, optionally mirroring its raw input/output into a live runtime log file.
 */
export async function runBashScriptWithOutput(options: RunGoScriptOptions): Promise<string> {
    await appendScriptExecutionLogStart(options);
    const bashExecution = buildLoggedBashExecution(options.scriptPath, options.logPath);
    const scriptPathPosix = toPosixPath(options.scriptPath);

    return await new Promise<string>((resolve, reject) => {
        const commandProcess = spawn('bash', bashExecution.args, {
            env: bashExecution.env ? { ...process.env, ...bashExecution.env } : process.env,
        });
        let output = '';
        let settled = false;
        let isSettling = false;

        /**
         * Appends the final log footer before settling.
         */
        const finishLog = async (status: string, details?: unknown): Promise<void> => {
            await appendScriptExecutionLogFinish({
                scriptPath: options.scriptPath,
                logPath: options.logPath,
                status,
                details,
            });
        };

        /**
         * Ensures the promise settles only once.
         */
        const settleOnce = (handler: () => void): void => {
            if (settled) {
                return;
            }

            settled = true;
            handler();
        };

        /**
         * Appends the final log footer and settles the promise exactly once.
         */
        const settleWithLog = (status: string, handler: () => void, details?: unknown): void => {
            if (isSettling || settled) {
                return;
            }

            isSettling = true;
            void finishLog(status, details).finally(() => {
                settleOnce(handler);
            });
        };

        commandProcess.stdout.on('data', (stdout) => {
            const chunk = stdout.toString();
            output += chunk;
            console.info(chunk);
        });

        commandProcess.stderr.on('data', (stderr) => {
            const chunk = stderr.toString();
            output += chunk;
            if (chunk.trim()) {
                console.warn(chunk);
            }
        });

        /**
         * Handles process exit and resolves or rejects accordingly.
         */
        const handleExit = (code: number | null): void => {
            if (code === 0) {
                settleWithLog('succeeded', () => resolve(spaceTrim(output)));
                return;
            }

            const failure = new Error(spaceTrim(output) || `Command "bash ${scriptPathPosix}" exited with code ${code}`);
            settleWithLog(`failed with exit code ${code ?? 'unknown'}`, () => reject(failure), failure);
        };

        commandProcess.on('close', handleExit);
        commandProcess.on('exit', handleExit);
        commandProcess.on('disconnect', () => {
            const failure = new Error(`Command "bash ${scriptPathPosix}" disconnected`);
            settleWithLog('failed after disconnect', () => reject(failure), failure);
        });
        commandProcess.on('error', (error) => {
            const failure = new Error(`Command "bash ${scriptPathPosix}" failed: ${error.message}`);
            settleWithLog('failed before completion', () => reject(failure), failure);
        });
    });
}
