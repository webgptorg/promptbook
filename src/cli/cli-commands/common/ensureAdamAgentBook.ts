import { constants } from 'fs';
import { copyFile, mkdir, stat } from 'fs/promises';
import { dirname, join } from 'path';
import { resolveBundledAgentBookPath } from './resolveBundledAgentBookPath';

/**
 * Adam's location relative to a directory of local agents.
 *
 * @private internal constant of CLI agent initialization
 */
export const ADAM_AGENT_BOOK_RELATIVE_PATH = '.core/adam.book';

/**
 * Creates the same Adam book used by the Agent Server without overwriting a project-owned book.
 *
 * @private internal utility of CLI agent initialization
 */
export async function ensureAdamAgentBook(agentDirectoryPath: string): Promise<'created' | 'unchanged'> {
    const adamBookPath = join(agentDirectoryPath, ADAM_AGENT_BOOK_RELATIVE_PATH);
    if (
        await stat(adamBookPath).then(
            (entry) => entry.isFile(),
            () => false,
        )
    ) {
        return 'unchanged';
    }

    const bundledAdamBookPath = await resolveBundledAgentBookPath('agents/default/.core/adam.book');
    await mkdir(dirname(adamBookPath), { recursive: true });
    try {
        await copyFile(bundledAdamBookPath, adamBookPath, constants.COPYFILE_EXCL);
        return 'created';
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            return 'unchanged';
        }
        throw error;
    }
}
