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
    prepareAgentsServerRuntime,
    type PreparedAgentsServerRuntime,
    resolveAgentsServerAppPath,
} from './buildAgentsServer';
import { DEFAULT_LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS } from '../../../../apps/agents-server/src/constants/serverLimits';

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
 * Delay between foreground CLI attempts to load internal Agents Server limits during startup.
 *
 * @private internal constant of `ptbk agents-server`
 */
const INTERNAL_SERVER_LIMITS_RETRY_DELAY_MS = 1_000;

/**
 * Maximum time spent waiting for the internal limits route before startup fails.
 *
 * @private internal constant of `ptbk agents-server`
 */
const INTERNAL_SERVER_LIMITS_STARTUP_TIMEOUT_MS = 60_000;

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
 * Explicit installed Agents Server env-file path provided by the standalone VPS installer.
 *
 * @private internal constant of `ptbk agents-server`
 */
const PTBK_AGENTS_SERVER_ENV_FILE_ENV = 'PTBK_AGENTS_SERVER_ENV_FILE';

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
 * Optional hostname used by the internal Next server.
 *
 * @private internal constant of `ptbk agents-server`
 */
const PTBK_HOSTNAME_ENV = 'PTBK_HOSTNAME';

/**
 * Entropy size for the local-only token shared by the CLI pump and the Next app.
 *
 * @private internal constant of `ptbk agents-server`
 */
const LOCAL_USER_CHAT_WORKER_TOKEN_BYTE_LENGTH = 32;

/**
 * Next runtime mode supported by the local Agents Server foreground launcher.
 *
 * @private internal type of `ptbk agents-server`
 */
export type AgentsServerNextRuntimeMode = 'start' | 'dev';

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
    readonly nextRuntimeMode: AgentsServerNextRuntimeMode;
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
 * Prepared Next runtime and child environment used by one foreground launch.
 *
 * @private internal type of `ptbk agents-server`
 */
type PreparedAgentsServerLaunch = {
    readonly runtimeArtifacts: PreparedAgentsServerRuntime;
    readonly runtimeChildEnvironment: AgentsServerChildEnvironment;
    readonly runtimePaths: AgentsServerRuntimePaths;
};

/**
 * Local runner limits loaded from the running Agents Server app.
 *
 * @private internal type of `ptbk agents-server`
 */
type LocalAgentRunnerLimits = {
    readonly maxFailedAttempts: number;
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
        const preparedLaunch = await prepareAgentsServerLaunch({
            childEnvironment,
            logStreams,
            options,
            runtimePaths,
            state,
        });

        nextServerProcess = startNextServer({
            nextCliPath: preparedLaunch.runtimeArtifacts.nextCliPath,
            options,
            runtimePaths: preparedLaunch.runtimePaths,
            childEnvironment: preparedLaunch.runtimeChildEnvironment,
            logStreams,
            state,
        });
        const localAgentRunnerLimits = await waitForLocalAgentRunnerLimits({
            port: options.port,
            environment: preparedLaunch.runtimeChildEnvironment,
            logStreams,
            state,
        });
        stopUserChatJobWorkerPump = startUserChatJobWorkerPump({
            port: options.port,
            environment: preparedLaunch.runtimeChildEnvironment,
            logStreams,
            state,
        });

        await withCurrentWorkingDirectory(runtimePaths.agentRootPath, async () => {
            await runMultipleAgentMessages(createLocalAgentRunOptions(options, localAgentRunnerLimits), {
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
 * Prepares the shared Next runtime for either production start or hot-reloading development mode.
 */
async function prepareAgentsServerLaunch(options: {
    readonly childEnvironment: AgentsServerChildEnvironment;
    readonly logStreams: AgentsServerLogStreams;
    readonly options: StartAgentsServerOptions;
    readonly runtimePaths: AgentsServerRuntimePaths;
    readonly state: AgentsServerSupervisorState;
}): Promise<PreparedAgentsServerLaunch> {
    const runtimeArtifacts =
        options.options.nextRuntimeMode === 'start'
            ? await ensureAgentsServerBuild({
                  appPath: options.runtimePaths.appPath,
                  environment: options.childEnvironment,
                  isBuildForced: options.options.isBuildForced,
                  onBuildEvent: (event) => {
                      logRunnerEvent(options.logStreams.runner, event);
                      forwardChildOutput(`${event}\n`, {
                          label: 'next-build',
                          logStream: options.logStreams.next,
                          state: options.state,
                      });
                  },
                  onBuildOutput: (chunk) => {
                      forwardChildOutput(chunk, {
                          label: 'next-build',
                          logStream: options.logStreams.next,
                          state: options.state,
                      });
                  },
              })
            : await prepareAgentsServerDevelopmentRuntime(options.runtimePaths.appPath, options.logStreams.runner);

    return {
        runtimeArtifacts,
        runtimeChildEnvironment: createAgentsServerRuntimeEnvironment(
            options.childEnvironment,
            runtimeArtifacts.nodeModulesPath,
            {
                isNextValidationIgnored: runtimeArtifacts.isAppPathMaterialized,
            },
        ) as AgentsServerChildEnvironment,
        runtimePaths: {
            ...options.runtimePaths,
            appPath: runtimeArtifacts.appPath,
        },
    };
}

/**
 * Resolves the hot-reloading Next runtime without running the production build step.
 */
async function prepareAgentsServerDevelopmentRuntime(
    appPath: string,
    runnerLogStream: WriteStream,
): Promise<PreparedAgentsServerRuntime> {
    logRunnerEvent(runnerLogStream, 'Preparing the Agents Server Next development runtime.');

    return prepareAgentsServerRuntime({
        appPath,
    });
}

/**
 * Loads Agents Server environment values, preferring the explicit installed env file when the standalone VPS
 * installer provided one.
 *
 * @private internal utility of `ptbk agents-server`
 */
export function loadAgentsServerProjectEnvironment(launchWorkingDirectory: string): void {
    const explicitEnvFilePath = process.env[PTBK_AGENTS_SERVER_ENV_FILE_ENV]?.trim();
    if (explicitEnvFilePath) {
        const explicitLoadResult = dotenv.config({ path: explicitEnvFilePath, override: true });
        if (!explicitLoadResult.error) {
            return;
        }
    }

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
 * Starts the configured Next server mode and wires its logs into the foreground dashboard.
 */
function startNextServer(options: {
    readonly nextCliPath: string;
    readonly options: StartAgentsServerOptions;
    readonly runtimePaths: AgentsServerRuntimePaths;
    readonly childEnvironment: NodeJS.ProcessEnv;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): ChildProcess {
    const nextRuntimeModeLabel = describeAgentsServerNextRuntimeMode(options.options.nextRuntimeMode);

    logRunnerEvent(
        options.logStreams.runner,
        `Starting the Agents Server Next process in ${nextRuntimeModeLabel} mode.`,
    );
    const nextArguments = [
        options.nextCliPath,
        options.options.nextRuntimeMode,
        '--port',
        String(options.options.port),
    ];
    const hostname = options.childEnvironment[PTBK_HOSTNAME_ENV]?.trim();

    if (hostname) {
        nextArguments.push('--hostname', hostname);
        logRunnerEvent(options.logStreams.runner, `Binding Agents Server Next process to ${hostname}.`);
    }

    const commandProcess = spawn(process.execPath, nextArguments, {
        cwd: options.runtimePaths.appPath,
        env: options.childEnvironment,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

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
 * Converts one Next runtime mode into a readable label for logs.
 */
function describeAgentsServerNextRuntimeMode(nextRuntimeMode: AgentsServerNextRuntimeMode): string {
    return nextRuntimeMode === 'dev' ? 'development' : 'production';
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
function createLocalAgentRunOptions(
    options: StartAgentsServerOptions,
    localAgentRunnerLimits: LocalAgentRunnerLimits,
): AgentRunOptions {
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
        maxMessageProcessingFailures: localAgentRunnerLimits.maxFailedAttempts,
    };
}

/**
 * Waits until the internal Next route can return current local runner limits.
 */
async function waitForLocalAgentRunnerLimits(options: {
    readonly port: number_port;
    readonly environment: AgentsServerChildEnvironment;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): Promise<LocalAgentRunnerLimits> {
    const startedAt = Date.now();
    let lastError: unknown;

    while (options.state.isContinuing && Date.now() - startedAt < INTERNAL_SERVER_LIMITS_STARTUP_TIMEOUT_MS) {
        try {
            const limits = await fetchLocalAgentRunnerLimits(options);
            logRunnerEvent(
                options.logStreams.runner,
                `Local agent runner max failed attempts: ${limits.maxFailedAttempts}.`,
            );
            return limits;
        } catch (error) {
            lastError = error;
            await wait(INTERNAL_SERVER_LIMITS_RETRY_DELAY_MS);
        }
    }

    if (!options.state.isContinuing) {
        return {
            maxFailedAttempts: DEFAULT_LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS,
        };
    }

    throw new NotAllowed(
        spaceTrim(`
            Failed to load local agent runner limits from the Agents Server.

            ${lastError instanceof Error ? lastError.message : String(lastError)}
        `),
    );
}

/**
 * Loads local runner limits through the token-protected internal Agents Server route.
 */
async function fetchLocalAgentRunnerLimits(options: {
    readonly port: number_port;
    readonly environment: AgentsServerChildEnvironment;
}): Promise<LocalAgentRunnerLimits> {
    const response = await fetch(`http://localhost:${options.port}/api/internal/agent-runner-limits`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            'x-user-chat-worker-token': options.environment.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
        },
    });

    if (!response.ok) {
        const details = await readUserChatJobWorkerErrorDetails(response);
        throw new Error(createInternalRouteErrorMessage('agent runner limits', response, details));
    }

    const payload = (await response.json()) as Partial<LocalAgentRunnerLimits>;
    return {
        maxFailedAttempts: normalizeLocalAgentRunnerMaxFailedAttempts(payload.maxFailedAttempts),
    };
}

/**
 * Normalizes the local runner retry cap returned by the internal server route.
 */
function normalizeLocalAgentRunnerMaxFailedAttempts(rawValue: unknown): number {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return DEFAULT_LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS;
    }

    return Math.floor(parsedValue);
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
    return createInternalRouteErrorMessage('user chat worker', response, details);
}

/**
 * Builds a foreground failure message for one internal Agents Server route.
 */
function createInternalRouteErrorMessage(routeLabel: string, response: Response, details: string | null): string {
    const statusText = response.statusText ? ` ${response.statusText}` : '';
    const statusMessage = `${response.status}${statusText}`;

    if (!details) {
        return `Internal ${routeLabel} route returned ${statusMessage}.`;
    }

    return `Internal ${routeLabel} route returned ${statusMessage}: ${details}`;
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

/**
 * Waits for the given delay.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}

// Note: [🟡] Code for CLI runtime [startAgentsServer](src/cli/cli-commands/agents-server/startAgentsServer.ts) should never be published outside of `@promptbook/cli`
