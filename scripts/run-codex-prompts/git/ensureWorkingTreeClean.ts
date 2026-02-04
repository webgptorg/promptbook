import spaceTrim from 'spacetrim';
import { isWorkingTreeClean } from '../../utils/autocommit/isWorkingTreeClean';

/**
 * Ensures the git working tree is clean before running the prompt.
 */
export async function ensureWorkingTreeClean(): Promise<void> {
    const isClean = await isWorkingTreeClean(process.cwd());
    if (!isClean) {
        throw new Error(
            spaceTrim(`
                Git working tree is not clean.

                Please commit or stash your changes before running this script
                OR run script with flag --ignore-git-changes
            

                Aborting
            `),
        );
    }
}
