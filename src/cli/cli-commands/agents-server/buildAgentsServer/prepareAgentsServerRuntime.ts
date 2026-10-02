import { isAgentsServerAppPathMaterialized } from './isAgentsServerAppPathMaterialized';
import type { PreparedAgentsServerRuntime } from './PreparedAgentsServerRuntime';
import { resolveAgentsServerAppPath } from './resolveAgentsServerAppPath';
import { resolveAgentsServerBuildAppPath } from './resolveAgentsServerBuildAppPath';
import { resolveNextCliPath } from './resolveNextCliPath';
import { resolveNodeModulesPath } from './resolveNodeModulesPath';

/**
 * Resolves the runtime app and dependency paths shared by Agents Server start and dev commands.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function prepareAgentsServerRuntime(
    options: {
        readonly appPath?: string;
        readonly projectPath?: string;
    } = {},
): Promise<PreparedAgentsServerRuntime> {
    const nextCliPath = resolveNextCliPath();
    const nodeModulesPath = resolveNodeModulesPath(nextCliPath);
    const appPath = await resolveAgentsServerBuildAppPath({
        sourceAppPath: options.appPath ?? (await resolveAgentsServerAppPath()),
        nodeModulesPath,
        projectPath: options.projectPath,
    });

    return {
        appPath,
        nextCliPath,
        nodeModulesPath,
        isAppPathMaterialized: isAgentsServerAppPathMaterialized(appPath, options.projectPath),
    };
}
