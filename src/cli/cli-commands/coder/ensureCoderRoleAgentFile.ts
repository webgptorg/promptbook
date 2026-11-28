import { constants } from 'fs';
import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { resolveBundledAgentBookPath } from '../common/resolveBundledAgentBookPath';
import type { InitializationStatus } from './boilerplateTemplates';

/**
 * Project-owned planning role selected when `coder plan` has no explicit Book override.
 * @private internal constant of Coder role resolution
 */
export const CODER_PLANNER_AGENT_FILE_PATH = 'agents/planner.book';

/**
 * Copies a bundled role without overwriting an existing project-owned Book, including on repeated init.
 *
 * @private internal utility of `coder init`
 */
export async function ensureCoderRoleAgentFile(
    projectPath: string,
    role: 'developer' | 'planner' | 'lawyer' | 'copywriter',
): Promise<InitializationStatus> {
    await mkdir(join(projectPath, 'agents'), { recursive: true });
    try {
        await copyFile(
            await resolveBundledAgentBookPath(`agents/default/${role}.book`),
            join(projectPath, 'agents', `${role}.book`),
            constants.COPYFILE_EXCL,
        );
        return 'created';
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            return 'unchanged';
        }
        throw error;
    }
}
