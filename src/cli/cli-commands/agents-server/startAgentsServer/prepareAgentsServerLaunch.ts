import type { WriteStream } from 'fs';
import {
    createAgentsServerRuntimeEnvironment,
    ensureAgentsServerBuild,
    prepareAgentsServerRuntime,
    type PreparedAgentsServerRuntime,
} from '../buildAgentsServer';
import type { AgentsServerChildEnvironment } from './AgentsServerChildEnvironment';
import type { AgentsServerLogStreams } from './AgentsServerLogStreams';
import { logRunnerEvent } from './AgentsServerLogStreams';
import type { AgentsServerRuntimePaths } from './AgentsServerRuntimePaths';
import type { AgentsServerSupervisorState } from './AgentsServerSupervisorState';
import { forwardChildOutput } from './forwardChildOutput';
import type { PreparedAgentsServerLaunch } from './PreparedAgentsServerLaunch';
import type { StartAgentsServerOptions } from './StartAgentsServerOptions';

/**
 * Prepares the shared Next runtime for either production start or hot-reloading development mode.
 *
 * @private internal utility of `startAgentsServer`
 */
export async function prepareAgentsServerLaunch(options: {
    readonly childEnvironment: AgentsServerChildEnvironment;
    readonly logStreams: AgentsServerLogStreams;
    readonly startOptions: StartAgentsServerOptions;
    readonly runtimePaths: AgentsServerRuntimePaths;
    readonly state: AgentsServerSupervisorState;
}): Promise<PreparedAgentsServerLaunch> {
    const runtimeArtifacts =
        options.startOptions.nextRuntimeMode === 'start'
            ? await ensureAgentsServerBuild({
                  appPath: options.runtimePaths.appPath,
                  environment: options.childEnvironment,
                  isBuildForced: options.startOptions.isBuildForced,
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
