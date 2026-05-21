import { ChildProcess, spawn } from 'child_process';
import colors from 'colors';
import { createWriteStream, WriteStream } from 'fs';
import { mkdir, mkdtemp, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { AgentRunOptions } from '../../run-agent-messages/AgentRunOptions';
import { runMultipleAgentMessages } from '../../run-agent-messages/main/runMultipleAgentMessages';
import { withCurrentWorkingDirectory } from '../../run-agent-messages/main/withCurrentWorkingDirectory';
import type { AgentsServerRunOptions } from '../AgentsServerRunOptions';

/**
 * Environment variable read by the Agents Server local chat runner bridge.
 */
const PTBK_AGENTS_SERVER_AGENT_REPOSITORIES_DIRECTORY_ENV = 'PTBK_AGENTS_SERVER_AGENT_REPOSITORIES_DIRECTORY';

/**
 * Root directory used beneath the OS temporary folder for one server run.
 */
const TEMPORARY_AGENTS_SERVER_DIRECTORY_PREFIX = 'ptbk-agents-server-';

/**
 * Child directory containing local per-agent message runner projects.
 */
const AGENT_REPOSITORIES_DIRECTORY_NAME = 'agent-repositories';

/**
 * User-visible logs directory created beneath the command starting directory.
 */
const LOGS_DIRECTORY_NAME = 'logs';

/**
 * Log file name for Next.js build and runtime output.
 */
const NEXT_SERVER_LOG_FILE_NAME = 'agents-server.log';

/**
 * Log file name for local coding-agent queue runner output.
 */
const AGENT_RUNNER_LOG_FILE_NAME = 'agents-server-agent-runner.log';

/**
 * Exit result for one spawned foreground child process.
 */
type ChildExitResult = {
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
};

/**
 * Starts the self-hosted Agents Server web app and local coding-agent runner in the foreground.
 */
export async function runAgentsServer(options: AgentsServerRunOptions): Promise<void> {
    const commandWorkingDirectory = process.cwd();
    const logsDirectoryPath = join(commandWorkingDirectory, LOGS_DIRECTORY_NAME);
    const nextServerLogPath = join(logsDirectoryPath, NEXT_SERVER_LOG_FILE_NAME);
    const agentRunnerLogPath = join(logsDirectoryPath, AGENT_RUNNER_LOG_FILE_NAME);
    const temporaryDirectoryPath = await mkdtemp(join(tmpdir(), TEMPORARY_AGENTS_SERVER_DIRECTORY_PREFIX));
    const agentRepositoriesDirectoryPath = join(temporaryDirectoryPath, AGENT_REPOSITORIES_DIRECTORY_NAME);
    const agentsServerAppDirectoryPath = await resolveAgentsServerAppDirectory(commandWorkingDirectory);

    await Promise.all([
        mkdir(logsDirectoryPath, { recursive: true }),
        mkdir(agentRepositoriesDirectoryPath, { recursive: true }),
    ]);

    const nextServerLogStream = createWriteStream(nextServerLogPath, { flags: 'a' });
    const agentRunnerLogStream = createWriteStream(agentRunnerLogPath, { flags: 'a' });
    let nextServerProcess: ChildProcess | undefined;
    let isRunning = true;

    const stop = (): void => {
        if (!isRunning) {
            return;
        }

        isRunning = false;
        nextServerProcess?.kill('SIGTERM');
    };
    const signalHandlers = registerStopSignalHandlers(stop);

    try {
        printRunSummary({
            options,
            temporaryDirectoryPath,
            agentRepositoriesDirectoryPath,
            nextServerLogPath,
            agentRunnerLogPath,
        });

        const nextEnvironment = createNextServerEnvironment(agentRepositoriesDirectoryPath, options.port);
        await buildAgentsServerApp({
            agentsServerAppDirectoryPath,
            environment: process.env,
            nextServerLogStream,
            isUiEnabled: !options.noUi,
        });

        nextServerProcess = startNextServerApp({
            agentsServerAppDirectoryPath,
            environment: nextEnvironment,
            port: options.port,
            nextServerLogStream,
            isUiEnabled: !options.noUi,
        });

        const agentRunnerPromise = mirrorProcessOutputToLog(agentRunnerLogStream, async () =>
            withCurrentWorkingDirectory(agentRepositoriesDirectoryPath, async () => {
                await runMultipleAgentMessages(createLocalAgentRunOptions(options), {
                    shouldContinue: () => isRunning,
                });
            }),
        );
        const nextExitPromise = waitForChildExit(nextServerProcess);
        const foregroundExit = await Promise.race([
            nextExitPromise.then((nextExitResult) => ({
                kind: 'next-server' as const,
                nextExitResult,
            })),
            agentRunnerPromise.then(() => ({
                kind: 'agent-runner' as const,
            }), (error) => ({
                kind: 'agent-runner-error' as const,
                error,
            })),
        ]);

        stop();

        if (foregroundExit.kind === 'agent-runner') {
            await nextExitPromise;

            throw new NotAllowed(
                spaceTrim(`
                    Agents Server coding-agent runner stopped before the web server exited.

                    - Log: \`${agentRunnerLogPath}\`
                `),
            );
        }

        if (foregroundExit.kind === 'agent-runner-error') {
            await nextExitPromise;
            throw foregroundExit.error;
        }

        await agentRunnerPromise;

        if (foregroundExit.nextExitResult.code !== 0 && foregroundExit.nextExitResult.signal !== 'SIGTERM') {
            throw new NotAllowed(
                spaceTrim(`
                    Agents Server Next.js process exited unexpectedly.

                    - Exit code: \`${foregroundExit.nextExitResult.code ?? 'unknown'}\`
                    - Signal: \`${foregroundExit.nextExitResult.signal ?? 'none'}\`
                    - Log: \`${nextServerLogPath}\`
                `),
            );
        }
    } finally {
        stop();
        unregisterStopSignalHandlers(signalHandlers);
        await Promise.all([closeLogStream(nextServerLogStream), closeLogStream(agentRunnerLogStream)]);
    }
}

/**
 * Creates the no-git multi-agent runner options required by local self-hosted agent projects.
 */
function createLocalAgentRunOptions(options: AgentsServerRunOptions): AgentRunOptions {
    return {
        agentName: options.agentName,
        model: options.model,
        noUi: true,
        thinkingLevel: options.thinkingLevel,
        noCommit: true,
        ignoreGitChanges: true,
        normalizeLineEndings: true,
        allowCredits: false,
        autoPush: false,
        autoPull: false,
        autoClone: false,
    };
}

/**
 * Prints the terminal status header for a foreground Agents Server session.
 */
function printRunSummary(options: {
    readonly options: AgentsServerRunOptions;
    readonly temporaryDirectoryPath: string;
    readonly agentRepositoriesDirectoryPath: string;
    readonly nextServerLogPath: string;
    readonly agentRunnerLogPath: string;
}): void {
    const lines = [
        colors.bold('Promptbook Agents Server'),
        `Web app: http://localhost:${options.options.port}`,
        `Runner: ${options.options.agentName}${options.options.model ? ` (${options.options.model})` : ''}`,
        `Agent repositories: ${options.agentRepositoriesDirectoryPath}`,
        `Temporary root: ${options.temporaryDirectoryPath}`,
        `Next.js log: ${options.nextServerLogPath}`,
        `Agent runner log: ${options.agentRunnerLogPath}`,
    ];

    console.info(lines.join('\n'));
}

/**
 * Builds the environment inherited by the Next.js app process.
 */
function createNextServerEnvironment(agentRepositoriesDirectoryPath: string, port: number): NodeJS.ProcessEnv {
    return {
        ...process.env,
        PORT: String(port),
        [PTBK_AGENTS_SERVER_AGENT_REPOSITORIES_DIRECTORY_ENV]: agentRepositoriesDirectoryPath,
    };
}

/**
 * Runs a production Next.js build before starting the self-hosted foreground server.
 */
async function buildAgentsServerApp(options: {
    readonly agentsServerAppDirectoryPath: string;
    readonly environment: NodeJS.ProcessEnv;
    readonly nextServerLogStream: WriteStream;
    readonly isUiEnabled: boolean;
}): Promise<void> {
    if (await isExistingFile(join(options.agentsServerAppDirectoryPath, '.next', 'BUILD_ID'))) {
        return;
    }

    const exitResult = await runLoggedChildProcess({
        commandArguments: [resolveNextCliEntrypoint(options.agentsServerAppDirectoryPath), 'build'],
        cwd: options.agentsServerAppDirectoryPath,
        environment: options.environment,
        logStream: options.nextServerLogStream,
        outputLabel: 'Next build',
        isUiEnabled: options.isUiEnabled,
    });

    if (exitResult.code === 0) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Agents Server Next.js build failed.

            - Exit code: \`${exitResult.code ?? 'unknown'}\`
            - Signal: \`${exitResult.signal ?? 'none'}\`
        `),
    );
}

/**
 * Starts the production Next.js app after the build succeeds.
 */
function startNextServerApp(options: {
    readonly agentsServerAppDirectoryPath: string;
    readonly environment: NodeJS.ProcessEnv;
    readonly port: number;
    readonly nextServerLogStream: WriteStream;
    readonly isUiEnabled: boolean;
}): ChildProcess {
    const childProcess = spawnNodeChildProcess(
        [resolveNextCliEntrypoint(options.agentsServerAppDirectoryPath), 'start', '--port', String(options.port)],
        options.agentsServerAppDirectoryPath,
        options.environment,
    );

    mirrorChildOutput(childProcess, options.nextServerLogStream, 'Next', options.isUiEnabled);
    return childProcess;
}

/**
 * Runs one logged Node.js child process to exit.
 */
async function runLoggedChildProcess(options: {
    readonly commandArguments: readonly string[];
    readonly cwd: string;
    readonly environment: NodeJS.ProcessEnv;
    readonly logStream: WriteStream;
    readonly outputLabel: string;
    readonly isUiEnabled: boolean;
}): Promise<ChildExitResult> {
    const childProcess = spawnNodeChildProcess(options.commandArguments, options.cwd, options.environment);
    mirrorChildOutput(childProcess, options.logStream, options.outputLabel, options.isUiEnabled);
    return await waitForChildExit(childProcess);
}

/**
 * Starts one Node.js child process with piped output.
 */
function spawnNodeChildProcess(
    commandArguments: readonly string[],
    cwd: string,
    environment: NodeJS.ProcessEnv,
): ChildProcess {
    return spawn(process.execPath, [...commandArguments], {
        cwd,
        env: environment,
        stdio: ['inherit', 'pipe', 'pipe'],
    });
}

/**
 * Resolves the locally installed Next CLI entrypoint for the app build/start subprocesses.
 */
function resolveNextCliEntrypoint(agentsServerAppDirectoryPath: string): string {
    return require.resolve('next/dist/bin/next', {
        paths: [agentsServerAppDirectoryPath, process.cwd(), __dirname],
    });
}

/**
 * Mirrors child stdout/stderr into a log file and optionally prefixes it in the terminal UI.
 */
function mirrorChildOutput(
    childProcess: ChildProcess,
    logStream: WriteStream,
    outputLabel: string,
    isUiEnabled: boolean,
): void {
    childProcess.stdout?.on('data', (chunk: Buffer | string) => {
        logStream.write(chunk);
        writeChildOutputToTerminal(process.stdout, chunk, outputLabel, isUiEnabled);
    });
    childProcess.stderr?.on('data', (chunk: Buffer | string) => {
        logStream.write(chunk);
        writeChildOutputToTerminal(process.stderr, chunk, outputLabel, isUiEnabled);
    });
}

/**
 * Writes child output either raw or line-prefixed in the status-oriented terminal view.
 */
function writeChildOutputToTerminal(
    stream: NodeJS.WriteStream,
    chunk: Buffer | string,
    outputLabel: string,
    isUiEnabled: boolean,
): void {
    const output = String(chunk);
    if (!isUiEnabled) {
        stream.write(output);
        return;
    }

    for (const line of output.split(/\r?\n/u).filter((line) => line.length > 0)) {
        stream.write(`[${outputLabel}] ${line}\n`);
    }
}

/**
 * Mirrors foreground runner output into a persistent log while preserving terminal output.
 */
async function mirrorProcessOutputToLog<T>(logStream: WriteStream, handler: () => Promise<T>): Promise<T> {
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = ((chunk: unknown, ...args: Array<unknown>) => {
        logStream.write(String(chunk));
        return originalStdoutWrite(chunk as never, ...(args as never[]));
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: unknown, ...args: Array<unknown>) => {
        logStream.write(String(chunk));
        return originalStderrWrite(chunk as never, ...(args as never[]));
    }) as typeof process.stderr.write;

    try {
        return await handler();
    } finally {
        process.stdout.write = originalStdoutWrite as typeof process.stdout.write;
        process.stderr.write = originalStderrWrite as typeof process.stderr.write;
    }
}

/**
 * Waits until one foreground child process exits.
 */
async function waitForChildExit(childProcess: ChildProcess): Promise<ChildExitResult> {
    return await new Promise((resolveChildExit, rejectChildExit) => {
        childProcess.once('error', rejectChildExit);
        childProcess.once('exit', (code, signal) => resolveChildExit({ code, signal }));
    });
}

/**
 * Resolves the Agents Server app directory from source-checkout and published-package layouts.
 */
async function resolveAgentsServerAppDirectory(commandWorkingDirectory: string): Promise<string> {
    const candidates = [
        join(commandWorkingDirectory, 'apps', 'agents-server'),
        resolve(__dirname, '..', '..', '..', 'apps', 'agents-server'),
        resolve(__dirname, '..', '..', '..', '..', 'apps', 'agents-server'),
        resolve(__dirname, '..', 'apps', 'agents-server'),
    ];

    for (const candidate of candidates) {
        if (await isAgentsServerAppDirectory(candidate)) {
            return candidate;
        }
    }

    throw new NotAllowed(
        spaceTrim(`
            Cannot locate the Agents Server Next.js app.

            Checked:
            ${candidates.map((candidate) => `- \`${candidate}\``).join('\n')}
        `),
    );
}

/**
 * Checks whether one directory contains the Agents Server package manifest.
 */
async function isAgentsServerAppDirectory(directoryPath: string): Promise<boolean> {
    return await isExistingFile(join(directoryPath, 'package.json'));
}

/**
 * Checks whether one filesystem path points to an existing file.
 */
async function isExistingFile(filePath: string): Promise<boolean> {
    try {
        return (await stat(filePath)).isFile();
    } catch {
        return false;
    }
}

/**
 * Registers foreground stop handlers and returns them for cleanup.
 */
function registerStopSignalHandlers(stop: () => void): ReadonlyArray<{
    readonly signal: NodeJS.Signals;
    readonly handler: () => void;
}> {
    const signalHandlers = (['SIGINT', 'SIGTERM'] as const).map((signal) => ({
        signal,
        handler: stop,
    }));

    for (const signalHandler of signalHandlers) {
        process.once(signalHandler.signal, signalHandler.handler);
    }

    return signalHandlers;
}

/**
 * Removes foreground stop handlers after shutdown.
 */
function unregisterStopSignalHandlers(
    signalHandlers: ReadonlyArray<{
        readonly signal: NodeJS.Signals;
        readonly handler: () => void;
    }>,
): void {
    for (const signalHandler of signalHandlers) {
        process.off(signalHandler.signal, signalHandler.handler);
    }
}

/**
 * Closes one append-only log stream.
 */
async function closeLogStream(logStream: WriteStream): Promise<void> {
    await new Promise<void>((resolveClose) => logStream.end(resolveClose));
}
