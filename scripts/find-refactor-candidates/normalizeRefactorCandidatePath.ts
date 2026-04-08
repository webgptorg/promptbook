/**
 * Normalizes a repo-relative path to use forward slashes.
 *
 * @private function of findRefactorCandidates
 */
export function normalizeRefactorCandidatePath(pathValue: string): string {
    const normalized = pathValue.replaceAll('\\', '/');
    return normalized.replace(/^\.\//, '');
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
