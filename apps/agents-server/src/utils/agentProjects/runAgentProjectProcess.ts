import { spawn } from 'node:child_process';
import { ParseError } from '../../../../../src/errors/ParseError';
import type { AgentProjectRecord } from './AgentProjectRecord';

/**
 * Default timeout for processes started inside a project folder.
 */
export const AGENT_PROJECT_PROCESS_DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Maximum timeout accepted for processes started inside a project folder.
 */
export const AGENT_PROJECT_PROCESS_MAX_TIMEOUT_MS = 60_000;

/**
 * Maximum characters returned from process stdout or stderr.
 */
const AGENT_PROJECT_PROCESS_OUTPUT_MAX_CHARACTERS = 24_000;

/**
 * Options for running one process inside a project folder.
 */
export type RunAgentProjectProcessOptions = {
    /**
     * Project owning the working directory.
     */
    readonly project: AgentProjectRecord;

    /**
     * Executable command name or path.
     */
    readonly command: string;

    /**
     * Command arguments.
     */
    readonly args: ReadonlyArray<string>;

    /**
     * Maximum runtime in milliseconds.
     */
    readonly timeoutMs: number;
};

/**
 * Captured result of one finished project process.
 */
export type AgentProjectProcessResult = {
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly stdout: string;
    readonly stderr: string;
    readonly didTimeout: boolean;
};

/**
 * Executes one process with the project folder as its working directory.
 *
 * @param options - Process options.
 * @returns Captured process result.
 */
export async function runAgentProjectProcess(
    options: RunAgentProjectProcessOptions,
): Promise<AgentProjectProcessResult> {
    return await new Promise((resolvePromise, rejectPromise) => {
        let stdout = '';
        let stderr = '';
        let isSettled = false;
        let didTimeout = false;
        const childProcess = spawn(options.command, [...options.args], {
            cwd: options.project.directoryPath,
            env: {
                ...process.env,
                PROMPTBOOK_AGENT_PROJECT_DIRECTORY: options.project.directoryPath,
                PROMPTBOOK_AGENT_PROJECT_ID: String(options.project.id),
                PROMPTBOOK_AGENT_PROJECT_NAME: options.project.name,
            },
            windowsHide: true,
        });
        const timeout = setTimeout(() => {
            didTimeout = true;
            childProcess.kill();
        }, options.timeoutMs);

        childProcess.stdout?.setEncoding('utf-8');
        childProcess.stderr?.setEncoding('utf-8');
        childProcess.stdout?.on('data', (chunk) => {
            stdout = appendLimitedProcessOutput(stdout, String(chunk));
        });
        childProcess.stderr?.on('data', (chunk) => {
            stderr = appendLimitedProcessOutput(stderr, String(chunk));
        });
        childProcess.on('error', (error) => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            clearTimeout(timeout);
            rejectPromise(error);
        });
        childProcess.on('close', (exitCode, signal) => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            clearTimeout(timeout);
            resolvePromise({
                exitCode,
                signal,
                stdout,
                stderr,
                didTimeout,
            });
        });
    });
}

/**
 * Normalizes optional process arguments provided by the model.
 *
 * @param rawArgs - Raw `args` tool argument.
 * @returns Validated argument list.
 */
export function normalizeAgentProjectProcessArgs(rawArgs: unknown): ReadonlyArray<string> {
    if (rawArgs === undefined || rawArgs === null) {
        return [];
    }

    if (!Array.isArray(rawArgs)) {
        throw new ParseError('Tool argument `args` must be an array of strings.');
    }

    return rawArgs.map((arg, index) => {
        if (typeof arg !== 'string') {
            throw new ParseError(`Tool argument \`args[${index}]\` must be a string.`);
        }

        return arg;
    });
}

/**
 * Normalizes optional process timeout provided by the model.
 *
 * @param rawTimeoutMs - Raw `timeoutMs` tool argument.
 * @returns Timeout clamped to the allowed range.
 */
export function normalizeAgentProjectProcessTimeoutMs(rawTimeoutMs: unknown): number {
    if (rawTimeoutMs === undefined || rawTimeoutMs === null) {
        return AGENT_PROJECT_PROCESS_DEFAULT_TIMEOUT_MS;
    }

    if (typeof rawTimeoutMs !== 'number' || !Number.isFinite(rawTimeoutMs)) {
        throw new ParseError('Tool argument `timeoutMs` must be a finite number.');
    }

    return Math.max(1, Math.min(Math.floor(rawTimeoutMs), AGENT_PROJECT_PROCESS_MAX_TIMEOUT_MS));
}

/**
 * Appends captured process output while capping returned text.
 *
 * @private function of `runAgentProjectProcess`
 */
function appendLimitedProcessOutput(currentOutput: string, chunk: string): string {
    const nextOutput = currentOutput + chunk;
    if (nextOutput.length <= AGENT_PROJECT_PROCESS_OUTPUT_MAX_CHARACTERS) {
        return nextOutput;
    }

    return `${nextOutput.slice(0, AGENT_PROJECT_PROCESS_OUTPUT_MAX_CHARACTERS)}\n[output truncated]`;
}
