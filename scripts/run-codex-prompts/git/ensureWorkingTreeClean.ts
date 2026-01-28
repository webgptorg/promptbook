import { isWorkingTreeClean } from '../../utils/autocommit/isWorkingTreeClean';

/**
 * Ensures the git working tree is clean before running the prompt.
 */
export async function ensureWorkingTreeClean(): Promise<void> {
    const isClean = await isWorkingTreeClean(process.cwd());
    if (!isClean) {
        throw new Error('Git working tree is not clean. Aborting.');
    }
}
