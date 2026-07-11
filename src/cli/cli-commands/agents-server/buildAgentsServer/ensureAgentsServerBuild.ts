import { createAgentsServerRuntimeEnvironment } from './createAgentsServerRuntimeEnvironment';
import { isAgentsServerBuildCacheCurrent } from './isAgentsServerBuildCacheCurrent';
import { prepareAgentsServerRuntime } from './prepareAgentsServerRuntime';
import type { PreparedAgentsServerRuntime } from './PreparedAgentsServerRuntime';
import { runNextBuild } from './runNextBuild';
import { writeAgentsServerBuildCache } from './writeAgentsServerBuildCache';

/**
 * Inputs controlling one cached Agents Server production build.
 */
type EnsureAgentsServerBuildOptions = {
    readonly appPath?: string;
    readonly environment?: NodeJS.ProcessEnv;
    readonly isBuildForced?: boolean;
    readonly onBuildEvent?: (event: string) => void;
    readonly onBuildOutput?: (chunk: string) => void;
};

/**
 * Ensures that the local Agents Server production build exists and matches its source fingerprint.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function ensureAgentsServerBuild(
    options: EnsureAgentsServerBuildOptions = {},
): Promise<PreparedAgentsServerRuntime> {
    const environment = options.environment ?? process.env;
    const preparedRuntime = await prepareAgentsServerRuntime({
        appPath: options.appPath,
    });
    const buildEnvironment = createAgentsServerRuntimeEnvironment(environment, preparedRuntime.nodeModulesPath, {
        isNextValidationIgnored: preparedRuntime.isAppPathMaterialized,
    });

    if (
        !options.isBuildForced &&
        (await isAgentsServerBuildCacheCurrent({
            appPath: preparedRuntime.appPath,
            environment: buildEnvironment,
        }))
    ) {
        options.onBuildEvent?.('Using the cached Agents Server Next app build.');
        return preparedRuntime;
    }

    options.onBuildEvent?.('Building the Agents Server Next app.');
    await runNextBuild({
        appPath: preparedRuntime.appPath,
        environment: buildEnvironment,
        nextCliPath: preparedRuntime.nextCliPath,
        onBuildOutput: options.onBuildOutput,
    });
    await writeAgentsServerBuildCache({
        appPath: preparedRuntime.appPath,
        environment: buildEnvironment,
    });

    return preparedRuntime;
}
