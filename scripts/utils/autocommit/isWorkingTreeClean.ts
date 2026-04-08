import { $execCommand } from '../../../src/utils/execCommand/$execCommand';

/**
 * Checks working tree clean.
 */
export async function isWorkingTreeClean(path: string): Promise<boolean> {
    const gitStatus = await $execCommand({
        cwd: path,
        command: `git status`,
    });

    return gitStatus.includes(`working tree clean`);
}

// Note: [🟡] Code for CLI support script [isWorkingTreeClean](scripts/utils/autocommit/isWorkingTreeClean.ts) should never be published outside of `@promptbook/cli`
