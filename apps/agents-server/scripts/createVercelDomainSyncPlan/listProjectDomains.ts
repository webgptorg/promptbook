import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import type { VercelApiConfiguration, VercelProjectDomain } from './VercelDomainSyncPlan';
import { requestVercel } from './requestVercel';

/**
 * Vercel list-project-domains response payload.
 */
type ListProjectDomainsResponse = {
    /**
     * Domains attached to the Vercel project.
     */
    readonly domains?: ReadonlyArray<VercelProjectDomain>;
    /**
     * Optional pagination metadata.
     */
    readonly pagination?: {
        /**
         * Cursor for the next page.
         */
        readonly next?: number | null;
    };
};

/**
 * Lists all project domains currently configured on Vercel.
 *
 * @param configuration - Vercel API configuration.
 * @returns Current project domains.
 *
 * @private function of `sync-vercel-domains`
 */
export async function listProjectDomains(configuration: VercelApiConfiguration): Promise<Array<VercelProjectDomain>> {
    const domains: Array<VercelProjectDomain> = [];
    let until: number | null = null;
    const seenPaginationCursors = new Set<number>();
    let hasMorePages = true;

    while (hasMorePages) {
        const searchParams = new URLSearchParams({ limit: '100' });
        if (until !== null) {
            searchParams.set('until', String(until));
        }

        const response = await requestVercel<ListProjectDomainsResponse>({
            configuration,
            method: 'GET',
            pathname: `/v10/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains`,
            searchParams,
        });

        domains.push(...(response.domains || []));

        if (response.pagination?.next === null || response.pagination?.next === undefined) {
            hasMorePages = false;
            continue;
        }

        if (seenPaginationCursors.has(response.pagination.next)) {
            throw new DatabaseError(
                spaceTrim(`
                    Vercel domains pagination repeated cursor \`${response.pagination.next}\`.
                `),
            );
        }

        seenPaginationCursors.add(response.pagination.next);
        until = response.pagination.next;
    }

    return domains;
}
