import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Captures project-owned fixture files while excluding the ignored planning runtime and linked test targets.
 * @private test utility of `coder plan`
 */
export async function snapshotPlanningProject(projectPath: string, directory = ''): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const entry of await readdir(join(projectPath, directory), { withFileTypes: true })) {
        if (entry.name === '.promptbook' || entry.isSymbolicLink()) continue;
        const path = directory ? `${directory}/${entry.name}` : entry.name;
        if (entry.isDirectory()) Object.assign(result, await snapshotPlanningProject(projectPath, path));
        else result[path] = await readFile(join(projectPath, path), 'utf-8');
    }
    return result;
}
