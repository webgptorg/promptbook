import { join, resolve } from 'path';
import { resolvePromptbookTemporaryPath } from '../../../../utils/filesystem/promptbookTemporaryPath';
import { isPathInsideNodeModules } from './isPathInsideNodeModules';
import { synchronizeMaterializedAgentsServerRuntime } from './synchronizeMaterializedAgentsServerRuntime';

/**
 * Uses the source checkout app directly, but copies npm-packaged app sources out of `node_modules`.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function resolveAgentsServerBuildAppPath(options: {
    readonly nodeModulesPath: string;
    readonly sourceAppPath: string;
}): Promise<string> {
    if (!isPathInsideNodeModules(options.sourceAppPath)) {
        return options.sourceAppPath;
    }

    const sourceRuntimeRootPath = resolve(options.sourceAppPath, '..', '..');
    const materializedRuntimeRootPath = resolvePromptbookTemporaryPath(process.cwd(), 'agents-server', 'runtime');

    await synchronizeMaterializedAgentsServerRuntime({
        materializedRuntimeRootPath,
        nodeModulesPath: options.nodeModulesPath,
        sourceAppPath: options.sourceAppPath,
        sourceRuntimeRootPath,
    });

    return join(materializedRuntimeRootPath, 'apps', 'agents-server');
}
