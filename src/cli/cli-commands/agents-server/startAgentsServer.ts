import { spawn, type ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';
import { createWriteStream, type WriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { spaceTrim } from 'spacetrim';
import type { ThinkingLevel } from '../coder/ThinkingLevel';
import type { PromptRunnerAgentName } from '../common/promptRunnerCliOptions';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { number_port } from '../../../types/number_positive';
import { resolvePromptbookTemporaryPath } from '../../../utils/filesystem/promptbookTemporaryPath';
import type { AgentRunOptions } from '../../../../scripts/run-agent-messages/AgentRunOptions';
import { runMultipleAgentMessages } from '../../../../scripts/run-agent-messages/main/runMultipleAgentMessages';
import { withCurrentWorkingDirectory } from '../../../../scripts/run-agent-messages/main/withCurrentWorkingDirectory';
import type { CoderRunUiHandle } from '../../../../scripts/run-codex-prompts/ui/renderCoderRunUi';
import {
    createAgentsServerRuntimeEnvironment,
    ensureAgentsServerBuild,
    resolveAgentsServerAppPath,
} from './buildAgentsServer';

/**
 * Local worker-pump delay while the Agents Server foreground process stays active.
 *
 * @private internal constant of `ptbk agents-server`
 */
const USER_CHAT_JOB_WORKER_POLL_INTERVAL_MS = 2_000;

/**
 * Number of identical worker failures suppressed before logging a repeated summary.
 *
 * @private internal constant of `ptbk agents-server`
 */
const USER_CHAT_JOB_WORKER_REPEATED_ERROR_LOG_INTERVAL = 10;

/**
 * Maximum worker response body length shown in foreground diagnostics.
 *
 * @private internal constant of `ptbk agents-server`
 */
const USER_CHAT_JOB_WORKER_ERROR_BODY_MAX_LENGTH = 2_000;

/**
 * HTTP status used by an idle internal worker tick with no job to process.
 *
 * @private internal constant of `ptbk agents-server`
 */
const HTTP_NO_CONTENT_STATUS_CODE = 204;

/**
 * Name of the local Agents Server log folder relative to the launch working directory.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_LOG_DIRECTORY_NAME = '.logs';

/**
 * Project environment file read from the Agents Server launch directory.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_PROJECT_ENV_FILE_NAME = '.env';

/**
 * Public local agent-root environment name consumed by the Agents Server app.
 *
 * @private internal constant of `ptbk agents-server`
 */
const PTBK_AGENTS_SERVER_AGENT_ROOT_ENV = 'PTBK_AGENTS_SERVER_AGENT_ROOT';

/**
 * Public database mode environment name consumed by the Agents Server app.
 *
 * @private internal constant of `ptbk agents-server`
 */
const PTBK_AGENTS_SERVER_DATABASE_ENV = 'PTBK_AGENTS_SERVER_DATABASE';

/**
 * Local SQLite file environment name consumed by the Agents Server app.
 *
 * @private internal constant of `ptbk agents-server`
 */
const PTBK_AGENTS_SERVER_SQLITE_PATH_ENV = 'PTBK_AGENTS_SERVER_SQLITE_PATH';

/**
 * Entropy size for the local-only token shared by the CLI pump and the Next app.
 *
 * @private internal constant of `ptbk agents-server`
 */
const LOCAL_USER_CHAT_WORKER_TOKEN_BYTE_LENGTH = 32;

/**
 * Options required to start the foreground Agents Server service group.
 *
 * @private internal type of `ptbk agents-server`
 */
export type StartAgentsServerOptions = {
    readonly port: number_port;
    readonly agentName: PromptRunnerAgentName;
    readonly model?: string;
    readonly noUi: boolean;
    readonly thinkingLevel?: ThinkingLevel;
    readonly allowCredits: boolean;
    readonly isBuildForced: boolean;
};

/**
 * Captures foreground file locations for one Agents Server launch.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerRuntimePaths = {
    readonly launchWorkingDirectory: string;
    readonly appPath: string;
    readonly agentRootPath: string;
    readonly logDirectoryPath: string;
    readonly nextLogPath: string;
    readonly runnerLogPath: string;
};

/**
 * Logger handles kept open for the foreground Agents Server lifetime.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerLogStreams = {
    readonly next: WriteStream;
    readonly runner: WriteStream;
};

/**
 * Subprocess environment carrying the explicit local worker credential.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerChildEnvironment = NodeJS.ProcessEnv & {
    readonly PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN: string;
};

/**
 * Mutable supervisor state shared with child-process and watcher callbacks.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerSupervisorState = {
    isContinuing: boolean;
    uiHandle?: CoderRunUiHandle;
    lastUserChatJobWorkerError?: {
        message: string;
        repeatCount: number;
    };
    nextExit?: {
        code: number | null;
        signal: NodeJS.Signals | null;
    };
};

/**
 * Starts the Agents Server web app and local coding-agent queue workers in the foreground.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function startAgentsServer(options: StartAgentsServerOptions): Promise<void> {
    const runtimePaths = await resolveAgentsServerRuntimePaths();
    loadAgentsServerProjectEnvironment(runtimePaths.launchWorkingDirectory);
    await Promise.all([
        mkdir(runtimePaths.agentRootPath, { recursive: true }),
        mkdir(runtimePaths.logDirectoryPath, { recursive: true }),
    ]);

    const logStreams = createAgentsServerLogStreams(runtimePaths);
    const state: AgentsServerSupervisorState = { isContinuing: true };
    const childEnvironment = createAgentsServerChildEnvironment(options.port, runtimePaths.agentRootPath);
    let nextServerProcess: ChildProcess | undefined;
    let stopUserChatJobWorkerPump: (() => void) | undefined;

    logRunnerEvent(logStreams.runner, `Launching from ${runtimePaths.launchWorkingDirectory}.`);
    logRunnerEvent(logStreams.runner, `Agent folders: ${runtimePaths.agentRootPath}.`);
    logRunnerEvent(logStreams.runner, `Agents Server URL: http://localhost:${options.port}.`);

    const processExitHandler = (): void => {
        stopChildProcess(nextServerProcess);
    };
    process.once('exit', processExitHandler);

    try {
        const buildArtifacts = await ensureAgentsServerBuild({
            appPath: runtimePaths.appPath,
            environment: childEnvironment,
            isBuildForced: options.isBuildForced,
            onBuildEvent: (event) => {
                logRunnerEvent(logStreams.runner, event);
                forwardChildOutput(`${event}\n`, {
                    label: 'next-build',
                    logStream: logStreams.next,
                    state,
                });
            },
            onBuildOutput: (chunk) => {
                forwardChildOutput(chunk, {
                    label: 'next-build',
                    logStream: logStreams.next,
                    state,
                });
            },
        });
        const runtimeChildEnvironment = createAgentsServerRuntimeEnvironment(
            childEnvironment,
            buildArtifacts.nodeModulesPath,
        ) as AgentsServerChildEnvironment;
        const builtRuntimePaths: AgentsServerRuntimePaths = {
            ...runtimePaths,
            appPath: buildArtifacts.appPath,
        };

        nextServerProcess = startNextServer({
            nextCliPath: buildArtifacts.nextCliPath,
            options,
            runtimePaths: builtRuntimePaths,
            childEnvironment: runtimeChildEnvironment,
            logStreams,
            state,
        });
        stopUserChatJobWorkerPump = startUserChatJobWorkerPump({
            port: options.port,
            environment: runtimeChildEnvironment,
            logStreams,
            state,
        });

        await withCurrentWorkingDirectory(runtimePaths.agentRootPath, async () => {
            await runMultipleAgentMessages(createLocalAgentRunOptions(options), {
                shouldContinue: () => state.isContinuing,
                watchErrorLogDirectoryPath: runtimePaths.logDirectoryPath,
                onUiInitialized: (uiHandle) => {
                    state.uiHandle = uiHandle;
                    addUiOutput(
                        state,
                        `Agents Server running at http://localhost:${options.port}. Next logs: ${runtimePaths.nextLogPath}`,
                    );
                },
            });
        });

        assertNextServerStillRunning(state);
    } finally {
        state.isContinuing = false;
        stopUserChatJobWorkerPump?.();
        stopChildProcess(nextServerProcess);
        process.off('exit', processExitHandler);
        closeAgentsServerLogStreams(logStreams);
    }
}

/**
 * Loads launch-directory `.env` values without overriding explicit process environment.
 *
 * @private internal utility of `ptbk agents-server`
 */
export function loadAgentsServerProjectEnvironment(launchWorkingDirectory: string): void {
    dotenv.config({ path: join(launchWorkingDirectory, AGENTS_SERVER_PROJECT_ENV_FILE_NAME) });
}

/**
 * Resolves local app, agent-root, and log paths for one foreground launch.
 */
async function resolveAgentsServerRuntimePaths(): Promise<AgentsServerRuntimePaths> {
    const launchWorkingDirectory = process.cwd();
    const appPath = await resolveAgentsServerAppPath();
    const logDirectoryPath = join(launchWorkingDirectory, AGENTS_SERVER_LOG_DIRECTORY_NAME);

    return {
        launchWorkingDirectory,
        appPath,
        agentRootPath: resolvePromptbookTemporaryPath(launchWorkingDirectory, 'agents-server', 'agents'),
        logDirectoryPath,
        nextLogPath: join(logDirectoryPath, 'agents-server-next.log'),
        runnerLogPath: join(logDirectoryPath, 'agents-server-runner.log'),
    };
}

/**
 * Starts the production Next server and wires its logs into the foreground dashboard.
 */
function startNextServer(options: {
    readonly nextCliPath: string;
    readonly options: StartAgentsServerOptions;
    readonly runtimePaths: AgentsServerRuntimePaths;
    readonly childEnvironment: NodeJS.ProcessEnv;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): ChildProcess {
    logRunnerEvent(options.logStreams.runner, 'Starting the Agents Server Next process.');

    const commandProcess = spawn(
        process.execPath,
        [options.nextCliPath, 'start', '--port', String(options.options.port)],
        {
            cwd: options.runtimePaths.appPath,
            env: options.childEnvironment,
            stdio: ['ignore', 'pipe', 'pipe'],
        },
    );

    bindChildOutput(commandProcess, {
        label: 'next',
        logStream: options.logStreams.next,
        state: options.state,
    });

    commandProcess.once('exit', (code, signal) => {
        options.state.nextExit = { code, signal };
        options.state.isContinuing = false;
        logRunnerEvent(
            options.logStreams.runner,
            `Agents Server Next process exited with code ${String(code)} and signal ${String(signal)}.`,
        );
    });

    commandProcess.once('error', (error) => {
        options.state.isContinuing = false;
        logRunnerEvent(options.logStreams.runner, `Agents Server Next process failed: ${error.message}`);
        addUiError(options.state, error.message);
    });

    return commandProcess;
}

/**
 * Connects child stdout/stderr to the persisted Next log and visible terminal output.
 */
function bindChildOutput(
    commandProcess: ChildProcess,
    options: {
        readonly label: string;
        readonly logStream: WriteStream;
        readonly state: AgentsServerSupervisorState;
    },
): void {
    commandProcess.stdout?.on('data', (chunk) => {
        forwardChildOutput(chunk.toString(), options);
    });
    commandProcess.stderr?.on('data', (chunk) => {
        forwardChildOutput(chunk.toString(), options);
    });
}

/**
 * Persists one child output chunk and forwards readable lines into UI or plain output.
 */
function forwardChildOutput(
    chunk: string,
    options: {
        readonly label: string;
        readonly logStream: WriteStream;
        readonly state: AgentsServerSupervisorState;
    },
): void {
    options.logStream.write(chunk);

    const visibleLines = chunk
        .split(/\r?\n/gu)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);

    for (const line of visibleLines) {
        const labeledLine = `[${options.label}] ${line}`;
        if (options.state.uiHandle) {
            addUiOutput(options.state, labeledLine);
        } else {
            process.stdout.write(`${labeledLine}\n`);
        }
    }
}

/**
 * Creates the subprocess environment for Next and its internal local runner bridge.
 */
function createAgentsServerChildEnvironment(port: number_port, agentRootPath: string): AgentsServerChildEnvironment {
    const launchWorkingDirectory = process.cwd();

    return {
        ...process.env,
        PORT: String(port),
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${port}`,
        [PTBK_AGENTS_SERVER_AGENT_ROOT_ENV]: agentRootPath,
        [PTBK_AGENTS_SERVER_SQLITE_PATH_ENV]:
            process.env[PTBK_AGENTS_SERVER_SQLITE_PATH_ENV] ||
            join(launchWorkingDirectory, '.promptbook', 'agents-server.sqlite'),
        [PTBK_AGENTS_SERVER_DATABASE_ENV]: process.env[PTBK_AGENTS_SERVER_DATABASE_ENV] || 'supabase',
        // Next loads app-local `.env` values after the CLI has prepared this bridge environment.
        PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN:
            process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN ||
            randomBytes(LOCAL_USER_CHAT_WORKER_TOKEN_BYTE_LENGTH).toString('hex'),
    };
}

/**
 * Creates local no-git agent runner options for folders managed by the Agents Server database.
 */
function createLocalAgentRunOptions(options: StartAgentsServerOptions): AgentRunOptions {
    return {
        agentName: options.agentName,
        model: options.model,
        noUi: options.noUi,
        thinkingLevel: options.thinkingLevel,
        noCommit: true,
        ignoreGitChanges: true,
        normalizeLineEndings: false,
        allowCredits: options.allowCredits,
        autoPush: false,
        autoPull: false,
        autoClone: false,
    };
}

/**
 * Starts periodic internal worker calls that queue and reconcile local message-folder jobs.
 */
function startUserChatJobWorkerPump(options: {
    readonly port: number_port;
    readonly environment: AgentsServerChildEnvironment;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): () => void {
    let isTickRunning = false;
    const interval = setInterval(() => {
        if (!options.state.isContinuing || isTickRunning) {
            return;
        }

        isTickRunning = true;
        triggerUserChatJobWorkerTick(options)
            .then(() => {
                clearUserChatJobWorkerError(options.state);
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                reportUserChatJobWorkerError({
                    logStream: options.logStreams.runner,
                    message,
                    state: options.state,
                });
            })
            .finally(() => {
                isTickRunning = false;
            });
    }, USER_CHAT_JOB_WORKER_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
}

/**
 * Calls one internal local job worker tick over the running Next app.
 */
async function triggerUserChatJobWorkerTick(options: {
    readonly port: number_port;
    readonly environment: AgentsServerChildEnvironment;
}): Promise<void> {
    const response = await fetch(`http://localhost:${options.port}/api/internal/user-chat-jobs/run`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'x-user-chat-worker-token': options.environment.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
        },
        body: '{}',
    });

    if (!response.ok && response.status !== HTTP_NO_CONTENT_STATUS_CODE) {
        const details = await readUserChatJobWorkerErrorDetails(response);
        throw new Error(createUserChatJobWorkerErrorMessage(response, details));
    }
}

/**
 * Reports worker failures while suppressing identical repeated foreground noise.
 */
function reportUserChatJobWorkerError(options: {
    readonly logStream: WriteStream;
    readonly message: string;
    readonly state: AgentsServerSupervisorState;
}): void {
    const previousError = options.state.lastUserChatJobWorkerError;

    if (previousError?.message === options.message) {
        const repeatCount = previousError.repeatCount + 1;
        options.state.lastUserChatJobWorkerError = {
            message: options.message,
            repeatCount,
        };

        if (repeatCount % USER_CHAT_JOB_WORKER_REPEATED_ERROR_LOG_INTERVAL !== 0) {
            return;
        }

        const repeatedMessage = `User chat worker tick is still failing after ${repeatCount} attempts: ${options.message}`;
        logRunnerEvent(options.logStream, repeatedMessage);
        addUiError(options.state, repeatedMessage);
        return;
    }

    options.state.lastUserChatJobWorkerError = {
        message: options.message,
        repeatCount: 1,
    };
    logRunnerEvent(options.logStream, `User chat worker tick failed: ${options.message}`);
    addUiError(options.state, options.message);
}

/**
 * Resets repeated-error suppression after a successful worker tick.
 */
function clearUserChatJobWorkerError(state: AgentsServerSupervisorState): void {
    state.lastUserChatJobWorkerError = undefined;
}

/**
 * Reads a worker error payload so foreground logs show the route-level reason.
 */
async function readUserChatJobWorkerErrorDetails(response: Response): Promise<string | null> {
    const body = await response.text().catch(() => '');
    const trimmedBody = body.trim();

    if (!trimmedBody) {
        return null;
    }

    const parsedMessage = parseUserChatJobWorkerErrorMessage(trimmedBody);
    return truncateUserChatJobWorkerErrorDetails(parsedMessage || trimmedBody);
}

/**
 * Extracts a readable error message from the worker route JSON response.
 */
function parseUserChatJobWorkerErrorMessage(body: string): string | null {
    try {
        const parsedBody = JSON.parse(body) as {
            error?: unknown;
            message?: unknown;
        };
        const errorMessage = typeof parsedBody.error === 'string' ? parsedBody.error : undefined;
        const fallbackMessage = typeof parsedBody.message === 'string' ? parsedBody.message : undefined;

        return errorMessage || fallbackMessage || null;
    } catch {
        return null;
    }
}

/**
 * Builds the foreground worker failure message from HTTP status and route details.
 */
function createUserChatJobWorkerErrorMessage(response: Response, details: string | null): string {
    const statusText = response.statusText ? ` ${response.statusText}` : '';
    const statusMessage = `${response.status}${statusText}`;

    if (!details) {
        return `Internal user chat worker returned ${statusMessage}.`;
    }

    return `Internal user chat worker returned ${statusMessage}: ${details}`;
}

/**
 * Keeps foreground worker diagnostics bounded when a route returns a large payload.
 */
function truncateUserChatJobWorkerErrorDetails(details: string): string {
    if (details.length <= USER_CHAT_JOB_WORKER_ERROR_BODY_MAX_LENGTH) {
        return details;
    }

    return `${details.slice(0, USER_CHAT_JOB_WORKER_ERROR_BODY_MAX_LENGTH)}...`;
}

/**
 * Creates file streams for service output persisted below `./logs`.
 */
function createAgentsServerLogStreams(runtimePaths: AgentsServerRuntimePaths): AgentsServerLogStreams {
    return {
        next: createWriteStream(runtimePaths.nextLogPath, { flags: 'a' }),
        runner: createWriteStream(runtimePaths.runnerLogPath, { flags: 'a' }),
    };
}

/**
 * Closes all foreground service log streams.
 */
function closeAgentsServerLogStreams(logStreams: AgentsServerLogStreams): void {
    logStreams.next.end();
    logStreams.runner.end();
}

/**
 * Appends one timestamped runner lifecycle event into its persistent log file.
 */
function logRunnerEvent(logStream: WriteStream, event: string): void {
    logStream.write(`[${new Date().toISOString()}] ${event}\n`);
}

/**
 * Adds one Next or worker output line to the rich terminal UI when it is active.
 */
function addUiOutput(state: AgentsServerSupervisorState, output: string): void {
    state.uiHandle?.state.addAgentOutput(output);
}

/**
 * Adds one service error line to the rich terminal UI when it is active.
 */
function addUiError(state: AgentsServerSupervisorState, error: string): void {
    state.uiHandle?.state.addError(error);
}

/**
 * Throws when the server child stopped while the watcher was still expected to be foreground work.
 */
function assertNextServerStillRunning(state: AgentsServerSupervisorState): void {
    if (!state.nextExit) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Agents Server Next process stopped.

            - Exit code: \`${String(state.nextExit.code)}\`
            - Signal: \`${String(state.nextExit.signal)}\`
        `),
    );
}

/**
 * Stops only the child process spawned for the local Next server.
 */
function stopChildProcess(commandProcess: ChildProcess | undefined): void {
    if (!commandProcess || commandProcess.killed) {
        return;
    }

    commandProcess.kill();
}

// Note: [🟡] Code for CLI runtime [startAgentsServer](src/cli/cli-commands/agents-server/startAgentsServer.ts) should never be published outside of `@promptbook/cli`
