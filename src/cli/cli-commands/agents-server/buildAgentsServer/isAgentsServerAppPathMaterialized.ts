import { resolvePromptbookTemporaryPath } from '../../../../utils/filesystem/promptbookTemporaryPath';

/**
 * Returns true when the app path points at the project-local materialized runtime.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function isAgentsServerAppPathMaterialized(appPath: string): boolean {
    const normalizedAppPath = appPath.replace(/\\/gu, '/');
    const normalizedMaterializedRuntimePath = resolvePromptbookTemporaryPath(
        process.cwd(),
        'agents-server',
        'runtime',
    ).replace(/\\/gu, '/');

    return normalizedAppPath.includes(normalizedMaterializedRuntimePath);
}
