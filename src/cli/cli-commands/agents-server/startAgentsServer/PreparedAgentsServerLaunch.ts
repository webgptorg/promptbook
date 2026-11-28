import type { PreparedAgentsServerRuntime } from '../buildAgentsServer/PreparedAgentsServerRuntime';
import type { AgentsServerChildEnvironment } from './AgentsServerChildEnvironment';
import type { AgentsServerRuntimePaths } from './AgentsServerRuntimePaths';

/**
 * Prepared Next runtime and child environment used by one foreground launch.
 *
 * @private internal type of `startAgentsServer`
 */
export type PreparedAgentsServerLaunch = {
    readonly runtimeArtifacts: PreparedAgentsServerRuntime;
    readonly runtimeChildEnvironment: AgentsServerChildEnvironment;
    readonly runtimePaths: AgentsServerRuntimePaths;
};
