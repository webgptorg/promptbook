import { readFile, stat } from 'fs/promises';
import ignore from 'ignore';
import { dirname, join, resolve } from 'path';
import { normalizeRefactorCandidatePath } from './normalizeRefactorCandidatePath';

/**
 * Project-relative path matcher used to skip paths matched by `.gitignore`.
 */
export type IsIgnoredRelativePath = (relativePath: string) => boolean;

/**
 * Project metadata resolved before scanning for refactor candidates.
 */
export type ResolvedRefactorCandidateProject = {
    /**
     * Absolute directory used as the scan root.
     */
    readonly rootDir: string;

    /**
     * Matcher used to skip project-relative paths covered by `.gitignore`.
     */
    readonly isIgnoredRelativePath: IsIgnoredRelativePath;
};

/**
 * Filename used to discover the project root for refactor-candidate scanning.
 */
const GITIGNORE_FILE_NAME = '.gitignore';

/**
 * Resolves the project root and `.gitignore` matcher for refactor-candidate scanning.
 *
 * @private function of findRefactorCandidates
 */
export async function resolveRefactorCandidateProject(startDir: string): Promise<ResolvedRefactorCandidateProject> {
    const absoluteStartDir = resolve(startDir);
    const gitignorePath = await findNearestGitignorePath(absoluteStartDir);

    if (!gitignorePath) {
        return {
            rootDir: absoluteStartDir,
            isIgnoredRelativePath: () => false,
        };
    }

    const rootDir = dirname(gitignorePath);
    const gitignoreMatcher = ignore().add(await readFile(gitignorePath, 'utf-8'));

    return {
        rootDir,
        isIgnoredRelativePath(relativePath: string): boolean {
            return gitignoreMatcher.ignores(normalizeRefactorCandidatePath(relativePath));
        },
    };
}

/**
 * Finds the nearest ancestor `.gitignore` so scans work from any project subdirectory.
 *
 * @private function of resolveRefactorCandidateProject
 */
async function findNearestGitignorePath(startDir: string): Promise<string | null> {
    let currentDir = resolve(startDir);

    while (true) {
        const gitignorePath = join(currentDir, GITIGNORE_FILE_NAME);
        if (await isExistingFile(gitignorePath)) {
            return gitignorePath;
        }

        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            return null;
        }

        currentDir = parentDir;
    }
}

/**
 * Detects whether a file exists without swallowing unexpected filesystem failures.
 *
 * @private function of resolveRefactorCandidateProject
 */
async function isExistingFile(filePath: string): Promise<boolean> {
    const fileStats = await stat(filePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
            return undefined;
        }

        throw error;
    });

    return fileStats?.isFile() ?? false;
}

// Note: [🟡] Code for repository script [resolveRefactorCandidateProject](scripts/find-refactor-candidates/resolveRefactorCandidateProject.ts) should never be published outside of `@promptbook/cli`
