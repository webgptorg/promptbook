import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../src/errors/NotAllowed';
import { createScriptOutputLineReader, type ScriptOutputLineReader } from './createScriptOutputLineReader';
import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { appendScriptExecutionLogFinish, appendScriptExecutionLogStart } from './scriptExecutionLog';
import { $spawnLoggedBashScript } from './$spawnLoggedBashScript';
import { $terminateLoggedBashProcessTree } from './$terminateLoggedBashProcessTree';
import { printLiveScriptChunk } from './printLiveScriptChunk';
import { toPosixPath } from './toPosixPath';

/**
 * Runs one temporary bash script, optionally mirroring its raw input/output into a live runtime log file.
 */
export async function runBashScriptWithOutput(options: RunGoScriptOptions): Promise<string> {
    options.signal?.throwIfAborted();
    await appendScriptExecutionLogStart(options);
    options.signal?.throwIfAborted();
    const scriptPathPosix = toPosixPath(options.scriptPath);
    const shouldPrintLiveOutput = options.shouldPrintLiveOutput ?? true;

    return await new Promise<string>((resolve, reject) => {
        const commandProcess = $spawnLoggedBashScript({
            projectPath: options.projectPath,
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
            options.signal?.removeEventListener('abort', cancel);
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
        const handleExit = (code: number | null, signal: NodeJS.Signals | null): void => {
            if (options.signal?.aborted) {
                settleWithLog('cancelled', () => reject(options.signal!.reason), options.signal.reason);
                return;
            }
            if (code === 0 && !signal) {
                settleWithLog('succeeded', () => {
                    // Cancellation can arrive while the runtime log footer is being flushed.
                    if (options.signal?.aborted) reject(options.signal.reason);
                    else resolve(spaceTrim(output));
                });
                return;
            }

            const failure = new NotAllowed(
                spaceTrim(
                    (block) => `
                Command "bash ${scriptPathPosix}" exited with code ${code ?? 'unknown'}${
                        signal ? ` and signal ${signal}` : ''
                    }.
                ${block(output)}
            `,
                ),
            );
            settleWithLog(
                `failed with exit code ${code ?? 'unknown'}${signal ? ` and signal ${signal}` : ''}`,
                () => reject(failure),
                failure,
            );
        };

        // Wait for `close`, not only `exit`, because the Bash wrapper can still be flushing its tee process
        // substitutions after the direct shell exits.
        commandProcess.on('close', handleExit);
        commandProcess.on('disconnect', () => {
            const failure = new NotAllowed(
                spaceTrim(
                    (block) => `
                    Command "bash ${scriptPathPosix}" disconnected.
                    ${block(output)}
                `,
                ),
            );
            settleWithLog('failed after disconnect', () => reject(failure), failure);
        });
        commandProcess.on('error', (error) => {
            const failure = new NotAllowed(
                spaceTrim(
                    (block) => `
                    Command "bash ${scriptPathPosix}" failed: ${error.message}
                    ${block(output)}
                `,
                ),
            );
            settleWithLog('failed before completion', () => reject(failure), failure);
        });
        /** Reuses the process-tree terminator; settlement waits for stream closure and the trace footer. */
        const cancel = (): void => $terminateLoggedBashProcessTree(commandProcess);
        options.signal?.addEventListener('abort', cancel, { once: true });
        if (options.signal?.aborted) cancel();
    });
}
