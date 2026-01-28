import { spawn } from 'child_process';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path/posix';
import { $execCommand } from '../../../../src/utils/execCommand/$execCommand';

/**
 * Converts a file path to POSIX format
 *
 * @private within the run-codex-prompts script
 * @copy from run-codex-prompts.ts
 */
export function toPosixPath(filePath: string): string {
    if (process.platform === 'win32') {
        const match = filePath.match(/^([a-zA-Z]):\\(.*)$/);
        if (match) {
            return `/${match[1]!.toLowerCase()}/${match[2]!.replace(/\\/g, '/')}`;
        }
    }
    return filePath.replace(/\\/g, '/');
}

/**
 * Options for running a temporary script.
 */
type RunGoScriptOptions = {
    /**
     * Path to the temporary script file
     */
    scriptPath: string;

    /**
     * Content of the temporary script file
     */
    scriptContent: string;
};

/**
 * Options for running a temporary script until a completion marker and idle timeout.
 */
type RunGoScriptUntilMarkerIdleOptions = RunGoScriptOptions & {
    /**
     * Matches a line that marks the completion of the command.
     */
    completionLineMatcher: RegExp;

    /**
     * Time to wait for additional output after the completion marker.
     */
    idleTimeoutMs: number;
};

/**
 * Creates a temporary script file, runs it, and then deletes it
 *
 * @private within the run-codex-prompts script
 */
export async function $runGoScript(options: RunGoScriptOptions): Promise<void> {
    const { scriptPath, scriptContent } = options;

    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, scriptContent, 'utf-8');

    try {
        await $execCommand({
            command: `bash "${toPosixPath(scriptPath)}"`,
            isVerbose: true, // <- Note: Proxy the raw command output to the console
        });
    } finally {
        await unlink(scriptPath).catch(() => undefined);
    }
}

/**
 * Creates a temporary script file, runs it, waits for a completion marker and idle time, and then deletes it.
 * Returns the captured output for post-processing.
 *
 * @private within the run-codex-prompts script
 */
export async function $runGoScriptUntilMarkerIdle(options: RunGoScriptUntilMarkerIdleOptions): Promise<string> {
    const { scriptPath, scriptContent } = options;

    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, scriptContent, 'utf-8');

    try {
        return await runScriptUntilMarkerIdle({
            scriptPath,
            completionLineMatcher: options.completionLineMatcher,
            idleTimeoutMs: options.idleTimeoutMs,
        });
    } finally {
        await unlink(scriptPath).catch(() => undefined);
    }
}

/**
 * Creates a temporary script file, runs it, captures output, and then deletes it
 *
 * @private within the run-codex-prompts script
 */
export async function $runGoScriptWithOutput(options: RunGoScriptOptions): Promise<string> {
    const { scriptPath, scriptContent } = options;

    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, scriptContent, 'utf-8');

    try {
        const result = await $execCommand({
            command: `bash "${toPosixPath(scriptPath)}"`,
            isVerbose: true, // <- Note: Proxy the raw command output to the console
        });
        return result;
    } finally {
        await unlink(scriptPath).catch(() => undefined);
    }
}

/**
 * Options for running an already written script until a completion marker and idle timeout.
 */
type RunScriptUntilMarkerIdleOptions = {
    /**
     * Path to the temporary script file.
     */
    scriptPath: string;

    /**
     * Matches a line that marks the completion of the command.
     */
    completionLineMatcher: RegExp;

    /**
     * Time to wait for additional output after the completion marker.
     */
    idleTimeoutMs: number;
};

/**
 * Runs a script until a completion marker is observed and output is idle for a set timeout.
 * Returns the captured output.
 */
async function runScriptUntilMarkerIdle(options: RunScriptUntilMarkerIdleOptions): Promise<string> {
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

        const scheduleIdleExit = (): void => {
            if (idleTimer) {
                clearTimeout(idleTimer);
            }
            idleTimer = setTimeout(() => {
                commandProcess.kill();
                settleOnce(() => resolve(fullOutput));
            }, idleTimeoutMs);
        };

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
