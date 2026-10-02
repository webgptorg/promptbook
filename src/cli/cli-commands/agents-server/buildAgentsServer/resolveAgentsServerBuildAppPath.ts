import { resolveConfinedWorkspacePath } from '../../../../../scripts/run-codex-prompts/workspace/workspaceAgentFiles';
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
    readonly projectPath?: string;
}): Promise<string> {
    if (!isPathInsideNodeModules(options.sourceAppPath)) {
        return options.sourceAppPath;
    }

    const sourceRuntimeRootPath = resolve(options.sourceAppPath, '..', '..');
    const materializedRuntimeRootPath = resolvePromptbookTemporaryPath(
        options.projectPath ?? process.cwd(),
        'agents-server',
        'runtime',
    );

    await resolveConfinedWorkspacePath(
        options.projectPath ?? process.cwd(),
        '.promptbook/agents-server/runtime/.probe',
        '.promptbook',
    );
    await synchronizeMaterializedAgentsServerRuntime({
        materializedRuntimeRootPath,
        nodeModulesPath: options.nodeModulesPath,
        sourceAppPath: options.sourceAppPath,
        sourceRuntimeRootPath,
    });

    return join(materializedRuntimeRootPath, 'apps', 'agents-server');
}
