import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { normalizeDomainForMatching } from '../../../src/utils/validators/url/normalizeDomainForMatching';

/**
 * Normalizes one managed domain from `_Server` or Vercel.
 *
 * @param domain - Raw domain string.
 * @returns Normalized domain.
 *
 * @private function of `sync-vercel-domains`
 */
export function normalizeManagedDomain(domain: string): string {
    const normalizedDomain = normalizeDomainForMatching(domain);
    if (!normalizedDomain) {
        throw new DatabaseError(
            spaceTrim(`
                Invalid domain encountered during Vercel sync: \`${domain}\`.
            `),
        );
    }

    return normalizedDomain;
}
