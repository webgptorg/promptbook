import { mkdir, mkdtemp, writeFile } from 'fs/promises';
import { join } from 'path';
import { resolvePromptbookTemporaryPath } from '../../../../utils/filesystem/promptbookTemporaryPath';
import { assertPlanningRuntimePath } from './assertPlanningRuntimePath';
import { PLANNING_RESPONSE_SCHEMA } from './planningProtocol';

/**
 * Host-owned structured output contract kept outside the PRD queue.
 * @private internal constant of `coder plan`
 */
export const PLANNING_RESPONSE_SCHEMA_FILENAME = 'response.schema.json';

/**
 * Creates isolated runtime state in the already ignored Promptbook location, outside the PRD queue.
 * An empty Git root prevents the harness from loading repository-local configuration and hooks.
 * @private internal utility of `coder plan`
 */
export async function createPlanningWorkspace(projectPath: string): Promise<string> {
    for (const path of [
        resolvePromptbookTemporaryPath(projectPath),
        resolvePromptbookTemporaryPath(projectPath, 'coder-plan'),
    ]) {
        assertPlanningRuntimePath(projectPath, path);
        await mkdir(path).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== 'EEXIST') throw error;
        });
        assertPlanningRuntimePath(projectPath, path);
    }
    const workspacePath = await mkdtemp(resolvePromptbookTemporaryPath(projectPath, 'coder-plan', 'session-'));
    await mkdir(join(workspacePath, '.git'));
    await writeFile(join(workspacePath, PLANNING_RESPONSE_SCHEMA_FILENAME), JSON.stringify(PLANNING_RESPONSE_SCHEMA), {
        encoding: 'utf-8',
        flag: 'wx',
    });
    return workspacePath;
}
