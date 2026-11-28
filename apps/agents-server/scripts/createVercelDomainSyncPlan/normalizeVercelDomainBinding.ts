/**
 * Normalizes the branch/custom-environment binding for one Vercel domain-like payload.
 *
 * @param domain - Existing or desired domain payload.
 * @returns Normalized branch/custom-environment binding.
 *
 * @private function of `sync-vercel-domains`
 */
export function normalizeVercelDomainBinding(domain: {
    readonly gitBranch?: string | null;
    readonly customEnvironmentId?: string | null;
}): {
    readonly gitBranch: string | null;
    readonly customEnvironmentId: string | null;
} {
    return {
        gitBranch: normalizeGitBranch(domain.gitBranch),
        customEnvironmentId: normalizeCustomEnvironmentId(domain.customEnvironmentId),
    };
}

/**
 * Normalizes one optional git branch.
 *
 * @param gitBranch - Raw git branch.
 * @returns Normalized git branch or `null`.
 *
 * @private function of `createVercelDomainSyncPlan`
 */
export function normalizeGitBranch(gitBranch: string | null | undefined): string | null {
    const normalizedGitBranch = typeof gitBranch === 'string' ? gitBranch.trim() : '';
    return normalizedGitBranch || null;
}

/**
 * Normalizes one optional custom-environment id.
 *
 * @param customEnvironmentId - Raw custom-environment id.
 * @returns Normalized id or `null`.
 *
 * @private function of `createVercelDomainSyncPlan`
 */
export function normalizeCustomEnvironmentId(customEnvironmentId: string | null | undefined): string | null {
    const normalizedCustomEnvironmentId = typeof customEnvironmentId === 'string' ? customEnvironmentId.trim() : '';
    return normalizedCustomEnvironmentId || null;
}

/**
 * Normalizes one Vercel custom-environment identifier for matching.
 *
 * @param value - Raw environment identifier.
 * @returns Normalized identifier.
 *
 * @private function of `createVercelDomainSyncPlan`
 */
export function normalizeEnvironmentIdentifier(value: string): string {
    return value.trim().toLowerCase();
}
