import glob from 'glob-promise';
import { relative, resolve } from 'path';
import { analyzeSourceFileForRefactorCandidate } from './analyzeSourceFileForRefactorCandidate';
import {
    LINE_COUNT_EXEMPT_GLOBS,
    SOURCE_FILE_EXTENSIONS,
    SOURCE_FILE_IGNORE_GLOBS,
    SOURCE_ROOTS,
} from './find-refactor-candidates.constants';
import { normalizeRefactorCandidatePath } from './normalizeRefactorCandidatePath';
import type { RefactorCandidate } from './RefactorCandidate';
import type { RefactorCandidateLevelConfiguration } from './RefactorCandidateLevel';
import type { IsIgnoredRelativePath } from './resolveRefactorCandidateProject';

/**
 * Input required to scan one project for refactor candidates.
 *
 * @private type of findRefactorCandidates
 */
type FindRefactorCandidatesInProjectOptions = {
    /**
     * Repository root to scan.
     */
    readonly rootDir: string;

    /**
     * Thresholds used to score files.
     */
    readonly heuristics: RefactorCandidateLevelConfiguration;

    /**
     * Matcher for project-relative paths that should be skipped because they are matched by `.gitignore`.
     */
    readonly isIgnoredRelativePath?: IsIgnoredRelativePath;
};

/**
 * Scans the repository and returns all files that qualify as refactor candidates.
 *
 * @private function of findRefactorCandidates
 */
export async function findRefactorCandidatesInProject(
    options: FindRefactorCandidatesInProjectOptions,
): Promise<ReadonlyArray<RefactorCandidate>> {
    const { heuristics, isIgnoredRelativePath = () => false, rootDir } = options;
    const lineCountExemptPaths = await buildExemptPathSet(rootDir, LINE_COUNT_EXEMPT_GLOBS, isIgnoredRelativePath);
    const sourceFiles = await listSourceFiles(rootDir, isIgnoredRelativePath);
    const candidates: RefactorCandidate[] = [];

    for (const filePath of sourceFiles) {
        const candidate = await analyzeSourceFileForRefactorCandidate({
            filePath,
            heuristics,
            lineCountExemptPaths,
            rootDir,
        });

        if (candidate) {
            candidates.push(candidate);
        }
    }

    return candidates;
}

/**
 * Lists all source files to scan based on configured roots and extensions.
 *
 * @private function of findRefactorCandidatesInProject
 */
async function listSourceFiles(
    rootDir: string,
    isIgnoredRelativePath: IsIgnoredRelativePath,
): Promise<ReadonlyArray<string>> {
    const extensions = SOURCE_FILE_EXTENSIONS.map((extension) => extension.replace(/^\./, '')).join(',');
    const extensionGlob = `{${extensions}}`;
    const patterns = [...SOURCE_ROOTS.map((root) => `${root}/**/*.${extensionGlob}`), `*.${extensionGlob}`];
    const files = new Set<string>();

    for (const pattern of patterns) {
        const matches = await glob(pattern, {
            cwd: rootDir,
            ignore: SOURCE_FILE_IGNORE_GLOBS,
            nodir: true,
            absolute: true,
        });

        for (const match of matches) {
            if (shouldIgnoreAbsolutePath(rootDir, match, isIgnoredRelativePath)) {
                continue;
            }
            files.add(match);
        }
    }

    return Array.from(files).sort();
}

/**
 * Builds a set of normalized absolute paths exempt from line-count checks.
 *
 * @private function of findRefactorCandidatesInProject
 */
async function buildExemptPathSet(
    rootDir: string,
    patterns: ReadonlyArray<string>,
    isIgnoredRelativePath: IsIgnoredRelativePath,
): Promise<Set<string>> {
    const exemptPaths = new Set<string>();

    for (const pattern of patterns) {
        const matches = await glob(pattern, {
            cwd: rootDir,
            ignore: SOURCE_FILE_IGNORE_GLOBS,
            nodir: true,
            absolute: true,
        });

        for (const match of matches) {
            if (shouldIgnoreAbsolutePath(rootDir, match, isIgnoredRelativePath)) {
                continue;
            }
            exemptPaths.add(normalizeAbsolutePath(match));
        }
    }

    return exemptPaths;
}

/**
 * Resolves whether an absolute path falls under the project `.gitignore` rules.
 *
 * @private function of findRefactorCandidatesInProject
 */
function shouldIgnoreAbsolutePath(
    rootDir: string,
    absolutePath: string,
    isIgnoredRelativePath: IsIgnoredRelativePath,
): boolean {
    const relativePath = normalizeRefactorCandidatePath(relative(rootDir, absolutePath));
    return isIgnoredRelativePath(relativePath);
}

/**
 * Normalizes an absolute path for consistent comparisons.
 *
 * @private function of findRefactorCandidatesInProject
 */
function normalizeAbsolutePath(pathValue: string): string {
    const normalized = resolve(pathValue);
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

// Note: [🟡] Code for repository script [findRefactorCandidatesInProject](scripts/find-refactor-candidates/findRefactorCandidatesInProject.ts) should never be published outside of `@promptbook/cli`
