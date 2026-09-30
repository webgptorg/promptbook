import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { isWorkingTreeClean } from '../../utils/autocommit/isWorkingTreeClean';

/**
 * Ensures the git working tree is clean before running the prompt.
 */
export async function ensureWorkingTreeClean(): Promise<void> {
    const isClean = await isWorkingTreeClean(process.cwd());
    if (!isClean) {
        throw new NotAllowed(
            spaceTrim(`
                Git working tree is not clean.

                Please commit or stash your changes before running this script
                OR decide what should happen with them:

                - \`--git-changes ignore\` leaves the changes where they are and starts the next prompt anyway
                - \`--git-changes continue\` resumes the single prompt which was left in the middle of its implementation

                Aborting
            `),
        );
    }
}
