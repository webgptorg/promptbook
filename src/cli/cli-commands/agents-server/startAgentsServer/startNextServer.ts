import { spawn, type ChildProcess } from 'child_process';
import type { AgentsServerChildEnvironment } from './AgentsServerChildEnvironment';
import type { AgentsServerLogStreams } from './AgentsServerLogStreams';
import { logRunnerEvent } from './AgentsServerLogStreams';
import type { AgentsServerRuntimePaths } from './AgentsServerRuntimePaths';
import type { AgentsServerSupervisorState } from './AgentsServerSupervisorState';
import { addUiError } from './AgentsServerSupervisorState';
import { forwardChildOutput } from './forwardChildOutput';
import { resolveAgentsServerChildHostname } from './resolveAgentsServerChildHostname';
import type { AgentsServerNextRuntimeMode, StartAgentsServerOptions } from './StartAgentsServerOptions';

/**
 * Starts the configured Next server mode and wires its logs into the foreground dashboard.
 *
 * @private internal utility of `startAgentsServer`
 */
export function startNextServer(options: {
    readonly nextCliPath: string;
    readonly startOptions: StartAgentsServerOptions;
    readonly runtimePaths: AgentsServerRuntimePaths;
    readonly childEnvironment: AgentsServerChildEnvironment;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): ChildProcess {
    const nextRuntimeModeLabel = describeAgentsServerNextRuntimeMode(options.startOptions.nextRuntimeMode);

    logRunnerEvent(
        options.logStreams.runner,
        `Starting the Agents Server Next process in ${nextRuntimeModeLabel} mode.`,
    );
    const nextArguments = [
        options.nextCliPath,
        options.startOptions.nextRuntimeMode,
        '--port',
        String(options.startOptions.port),
    ];
    const hostname = resolveAgentsServerChildHostname(options.childEnvironment);

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
        readonly logStream: AgentsServerLogStreams['next'];
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
