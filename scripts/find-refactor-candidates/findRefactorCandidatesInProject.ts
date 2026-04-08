import glob from 'glob-promise';
import { resolve } from 'path';
import { analyzeSourceFileForRefactorCandidate } from './analyzeSourceFileForRefactorCandidate';
import {
    LINE_COUNT_EXEMPT_GLOBS,
    SOURCE_FILE_EXTENSIONS,
    SOURCE_FILE_IGNORE_GLOBS,
    SOURCE_ROOTS,
} from './find-refactor-candidates.constants';
import type { RefactorCandidate } from './RefactorCandidate';

/**
 * Scans the repository and returns all files that qualify as refactor candidates.
 *
 * @private function of findRefactorCandidates
 */
export async function findRefactorCandidatesInProject(rootDir: string): Promise<ReadonlyArray<RefactorCandidate>> {
    const lineCountExemptPaths = await buildExemptPathSet(rootDir, LINE_COUNT_EXEMPT_GLOBS);
    const sourceFiles = await listSourceFiles(rootDir);
    const candidates: RefactorCandidate[] = [];

    for (const filePath of sourceFiles) {
        const candidate = await analyzeSourceFileForRefactorCandidate({
            filePath,
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
async function listSourceFiles(rootDir: string): Promise<ReadonlyArray<string>> {
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
async function buildExemptPathSet(rootDir: string, patterns: ReadonlyArray<string>): Promise<Set<string>> {
    const exemptPaths = new Set<string>();

    for (const pattern of patterns) {
        const matches = await glob(pattern, {
            cwd: rootDir,
            ignore: SOURCE_FILE_IGNORE_GLOBS,
            nodir: true,
            absolute: true,
        });

        for (const match of matches) {
            exemptPaths.add(normalizeAbsolutePath(match));
        }
    }

    return exemptPaths;
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

/** Note: [🟡] Code for repository script [findRefactorCandidatesInProject](scripts/find-refactor-candidates/findRefactorCandidatesInProject.ts) should never be published outside of `@promptbook/cli` */
