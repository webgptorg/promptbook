import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import type {
    VercelApiConfiguration,
    VercelCustomEnvironment,
    VercelProjectMetadata,
} from './VercelDomainSyncPlan';
import { normalizeGitBranch } from './normalizeVercelDomainBinding';
import { requestVercel } from './requestVercel';

/**
 * Maximum number of projects loaded from one Vercel projects page.
 */
const VERCEL_PROJECTS_PAGE_LIMIT = 100;

/**
 * Minimal Vercel projects-list entry used to look up project metadata.
 */
type VercelProjectLookupEntry = {
    /**
     * Vercel project id.
     */
    readonly id: string;
    /**
     * Vercel project name.
     */
    readonly name: string;
    /**
     * Git integration metadata.
     */
    readonly link?: {
        /**
         * Production branch configured for the project.
         */
        readonly productionBranch?: string | null;
    };
    /**
     * Optional custom environments returned by the Vercel API.
     */
    readonly customEnvironments?: ReadonlyArray<Record<string, unknown>>;
};

/**
 * Vercel list-projects response payload.
 */
type ListProjectsResponse =
    | {
          /**
           * Project entries returned on the page.
           */
          readonly projects?: ReadonlyArray<VercelProjectLookupEntry>;
          /**
           * Optional pagination metadata.
           */
          readonly pagination?: {
              /**
               * Cursor for the next page.
               */
              readonly next?: string | number | null;
          };
      }
    | ReadonlyArray<VercelProjectLookupEntry>;

/**
 * Loads the Vercel project metadata required for domain/environment binding decisions.
 *
 * @param configuration - Vercel API configuration.
 * @returns Normalized project metadata.
 *
 * @private function of `sync-vercel-domains`
 */
export async function loadProjectMetadata(configuration: VercelApiConfiguration): Promise<VercelProjectMetadata> {
    let from: string | number | null = null;
    const seenPaginationCursors = new Set<string>();
    let hasMorePages = true;

    while (hasMorePages) {
        const searchParams = new URLSearchParams({ limit: String(VERCEL_PROJECTS_PAGE_LIMIT) });
        if (from !== null) {
            searchParams.set('from', String(from));
        }

        const response = await requestVercel<ListProjectsResponse>({
            configuration,
            method: 'GET',
            pathname: '/v10/projects',
            searchParams,
        });

        const projects = extractProjectsFromResponse(response);
        const project = projects.find(
            (candidate) =>
                candidate.id === configuration.projectIdOrName || candidate.name === configuration.projectIdOrName,
        );
        if (project) {
            return normalizeProjectMetadata(project);
        }

        const nextCursor = extractNextProjectsCursor(response);
        if (nextCursor === null) {
            hasMorePages = false;
            continue;
        }

        const normalizedNextCursor = String(nextCursor);
        if (seenPaginationCursors.has(normalizedNextCursor)) {
            throw new DatabaseError(
                spaceTrim(`
                    Vercel projects pagination repeated cursor \`${normalizedNextCursor}\`.
                `),
            );
        }

        seenPaginationCursors.add(normalizedNextCursor);
        from = nextCursor;
    }

    throw new DatabaseError(
        spaceTrim(`
            Failed to load Vercel project metadata for \`${configuration.projectIdOrName}\`.
        `),
    );
}

/**
 * Extracts project entries from the Vercel projects-list response.
 *
 * @param response - Raw Vercel response payload.
 * @returns Project entries for the page.
 */
function extractProjectsFromResponse(response: ListProjectsResponse): Array<VercelProjectLookupEntry> {
    if (Array.isArray(response)) {
        return [...response];
    }

    return [...(('projects' in response ? response.projects : []) || [])];
}

/**
 * Extracts the next pagination cursor from the Vercel projects-list response.
 *
 * @param response - Raw Vercel response payload.
 * @returns Pagination cursor or `null`.
 */
function extractNextProjectsCursor(response: ListProjectsResponse): string | number | null {
    if (Array.isArray(response)) {
        return null;
    }

    return ('pagination' in response ? response.pagination?.next : null) ?? null;
}

/**
 * Normalizes raw Vercel project metadata.
 *
 * @param project - Raw project lookup entry.
 * @returns Normalized project metadata.
 */
function normalizeProjectMetadata(project: VercelProjectLookupEntry): VercelProjectMetadata {
    return {
        productionBranch: normalizeGitBranch(project.link?.productionBranch || '') || '',
        customEnvironments: parseCustomEnvironments(project.customEnvironments),
    };
}

/**
 * Parses custom-environment entries returned by the Vercel API.
 *
 * @param rawCustomEnvironments - Raw custom-environment payload.
 * @returns Normalized custom environments.
 */
function parseCustomEnvironments(
    rawCustomEnvironments: ReadonlyArray<Record<string, unknown>> | null | undefined,
): Array<VercelCustomEnvironment> {
    const result: Array<VercelCustomEnvironment> = [];

    for (const rawCustomEnvironment of rawCustomEnvironments || []) {
        const id = typeof rawCustomEnvironment.id === 'string' ? rawCustomEnvironment.id.trim() : '';
        if (!id) {
            continue;
        }

        const slug = typeof rawCustomEnvironment.slug === 'string' ? rawCustomEnvironment.slug.trim() : undefined;
        const name = typeof rawCustomEnvironment.name === 'string' ? rawCustomEnvironment.name.trim() : undefined;

        if (!result.some((existingCustomEnvironment) => existingCustomEnvironment.id === id)) {
            result.push({ id, slug, name });
        }
    }

    return result;
}
