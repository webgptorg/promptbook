import { spaceTrim } from 'spacetrim';
import { createScriptOutputLineReader, type ScriptOutputLineReader } from './createScriptOutputLineReader';
import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { appendScriptExecutionLogFinish, appendScriptExecutionLogStart } from './scriptExecutionLog';
import { $spawnLoggedBashScript } from './$spawnLoggedBashScript';
import { printLiveScriptChunk } from './printLiveScriptChunk';
import { toPosixPath } from './toPosixPath';

/**
 * Runs one temporary bash script, optionally mirroring its raw input/output into a live runtime log file.
 */
export async function runBashScriptWithOutput(options: RunGoScriptOptions): Promise<string> {
    await appendScriptExecutionLogStart(options);
    const scriptPathPosix = toPosixPath(options.scriptPath);
    const shouldPrintLiveOutput = options.shouldPrintLiveOutput ?? true;

    return await new Promise<string>((resolve, reject) => {
        const commandProcess = $spawnLoggedBashScript({
            scriptPath: options.scriptPath,
            logPath: options.logPath,
        });
        const outputLineReaders: Readonly<Record<'stdout' | 'stderr', ScriptOutputLineReader>> = {
            stdout: createScriptOutputLineReader(),
            stderr: createScriptOutputLineReader(),
        };
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

        /**
         * Accumulates one output chunk and reports the lines it completed.
         */
        const handleChunk = (chunk: string, source: 'stdout' | 'stderr'): void => {
            output += chunk;
            printLiveScriptChunk(chunk, source, shouldPrintLiveOutput);

            for (const line of outputLineReaders[source].readCompletedLines(chunk)) {
                options.onOutputLine?.(line);
            }
        };

        commandProcess.stdout.on('data', (stdout) => handleChunk(stdout.toString(), 'stdout'));
        commandProcess.stderr.on('data', (stderr) => handleChunk(stderr.toString(), 'stderr'));

        /**
         * Handles process exit and resolves or rejects accordingly.
         */
        const handleExit = (code: number | null): void => {
            if (code === 0) {
                settleWithLog('succeeded', () => resolve(spaceTrim(output)));
                return;
            }

            const failure = new Error(
                spaceTrim(output) || `Command "bash ${scriptPathPosix}" exited with code ${code}`,
            );
            settleWithLog(`failed with exit code ${code ?? 'unknown'}`, () => reject(failure), failure);
        };

        // Wait for `close`, not only `exit`, because the Bash wrapper can still be flushing its tee process
        // substitutions after the direct shell exits.
        commandProcess.on('close', handleExit);
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
