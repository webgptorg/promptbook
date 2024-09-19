import { execCommand } from '../execCommand/execCommand';

export async function isWorkingTreeClean(path: string): Promise<boolean> {
    const gitStatus = await execCommand({
        cwd: path,
        command: `git status`,
    });

    return gitStatus.includes(`working tree clean`);
}


/**
 * Note: [⚫] Code in this file should never be published in any package
 */