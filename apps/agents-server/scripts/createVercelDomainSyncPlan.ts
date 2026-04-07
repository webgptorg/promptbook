import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { SERVER_ENVIRONMENT, type ServerEnvironment, type ServerRecord } from '../src/utils/serverRegistry';
import { normalizeManagedDomain } from './normalizeManagedDomain';

/**
 * Default Vercel API base URL.
 */
const VERCEL_API_BASE_URL = 'https://api.vercel.com';

/**
 * Project domains that are managed by Vercel itself and should not be deleted.
 */
const VERCEL_PLATFORM_DOMAIN_SUFFIX = '.vercel.app';

/**
 * HTTP status returned by Vercel for successful delete responses without body.
 */
const HTTP_STATUS_NO_CONTENT = 204;

/**
 * Maximum number of projects loaded from one Vercel projects page.
 */
const VERCEL_PROJECTS_PAGE_LIMIT = 100;

/**
 * `_Server.environment` -> Vercel routing mapping.
 */
const SERVER_ENVIRONMENT_VERCEL_BINDINGS = {
    [SERVER_ENVIRONMENT.LTS]: {
        gitBranch: 'lts',
        vercelEnvironmentName: 'lts',
        customEnvironmentLookupName: 'lts',
    },
    [SERVER_ENVIRONMENT.PRODUCTION]: {
        gitBranch: 'production',
        vercelEnvironmentName: 'Production',
    },
    [SERVER_ENVIRONMENT.PREVIEW]: {
        gitBranch: 'preview',
        vercelEnvironmentName: 'Preview',
    },
    [SERVER_ENVIRONMENT.LIVE]: {
        gitBranch: 'main',
        vercelEnvironmentName: 'Development',
    },
} as const;

/**
 * Minimal Vercel project-domain payload used by the sync script.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelProjectDomain = {
    /**
     * Domain name registered on the Vercel project.
     */
    readonly name: string;
    /**
     * Whether the domain is already verified by Vercel.
     */
    readonly verified?: boolean;
    /**
     * Git branch linked to the domain when it targets a non-production branch deployment.
     */
    readonly gitBranch?: string | null;
    /**
     * Custom Vercel environment identifier linked to the domain.
     */
    readonly customEnvironmentId?: string | null;
};

/**
 * Desired domain configuration derived from one `_Server` row.
 *
 * @private type of `sync-vercel-domains`
 */
export type DesiredVercelProjectDomain = {
    /**
     * Domain name registered on the Vercel project.
     */
    readonly name: string;
    /**
     * Source `_Server.environment` value.
     */
    readonly sourceEnvironment: ServerEnvironment;
    /**
     * Human-readable Vercel environment label used for diagnostics.
     */
    readonly vercelEnvironmentName: string;
    /**
     * Git branch bound to the domain when applicable.
     */
    readonly gitBranch?: string;
    /**
     * Custom Vercel environment id bound to the domain when applicable.
     */
    readonly customEnvironmentId?: string;
};

/**
 * Reconfiguration step for an existing domain whose Vercel binding drifted from `_Server`.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelDomainReconfiguration = {
    /**
     * Existing Vercel domain payload.
     */
    readonly currentDomain: VercelProjectDomain;
    /**
     * Desired Vercel domain payload derived from `_Server`.
     */
    readonly desiredDomain: DesiredVercelProjectDomain;
    /**
     * Human-readable mismatch reasons.
     */
    readonly reasons: ReadonlyArray<string>;
};

/**
 * Diff between `_Server` domains and current Vercel project domains.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelDomainSyncPlan = {
    /**
     * Normalized domains required by `_Server`.
     */
    readonly desiredDomains: ReadonlyArray<string>;
    /**
     * Project domains that should be added on Vercel.
     */
    readonly domainsToAdd: ReadonlyArray<DesiredVercelProjectDomain>;
    /**
     * Existing project domains that should be verified.
     */
    readonly domainsToVerify: ReadonlyArray<string>;
    /**
     * Existing project domains that should be rebound to a different branch/environment.
     */
    readonly domainsToReconfigure: ReadonlyArray<VercelDomainReconfiguration>;
    /**
     * Existing project domains missing from `_Server`.
     */
    readonly domainsToFlag: ReadonlyArray<string>;
    /**
     * Ignored Vercel-managed domains.
     */
    readonly ignoredDomains: ReadonlyArray<string>;
};

/**
 * Vercel API configuration loaded from environment variables.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelApiConfiguration = {
    /**
     * Project id or name accepted by Vercel project-domain endpoints.
     */
    readonly projectIdOrName: string;
    /**
     * API token used for authentication.
     */
    readonly token: string;
    /**
     * Optional team id for team-owned projects.
     */
    readonly teamId?: string;
};

/**
 * Minimal custom-environment metadata required for LTS domain routing.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelCustomEnvironment = {
    /**
     * Stable Vercel custom environment id.
     */
    readonly id: string;
    /**
     * Optional slug used in the Vercel UI/API.
     */
    readonly slug?: string;
    /**
     * Optional display name used in the Vercel UI/API.
     */
    readonly name?: string;
};

/**
 * Minimal Vercel project metadata required by the sync script.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelProjectMetadata = {
    /**
     * Production branch configured on the Vercel project.
     */
    readonly productionBranch: string;
    /**
     * Custom environments configured on the Vercel project.
     */
    readonly customEnvironments: ReadonlyArray<VercelCustomEnvironment>;
};

/**
 * Minimal Vercel domain-configuration payload used to derive Cloudflare DNS targets.
 *
 * @private type of `sync-vercel-domains`
 */
export type VercelDomainConfiguration = {
    /**
     * Recommended IPv4 records for the domain.
     */
    readonly recommendedIPv4: ReadonlyArray<{
        /**
         * Lower rank means higher preference.
         */
        readonly rank: number;
        /**
         * Recommended IPv4 values.
         */
        readonly value: ReadonlyArray<string>;
    }>;
    /**
     * Recommended CNAME records for the domain.
     */
    readonly recommendedCNAME: ReadonlyArray<{
        /**
         * Lower rank means higher preference.
         */
        readonly rank: number;
        /**
         * Recommended CNAME target.
         */
        readonly value: string;
    }>;
    /**
     * Whether Vercel considers the domain currently misconfigured.
     */
    readonly misconfigured: boolean;
};

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
 * Loads Vercel API configuration from environment variables.
 *
 * @returns Validated Vercel API configuration.
 * @private function of `sync-vercel-domains`
 */
export function loadVercelApiConfiguration(): VercelApiConfiguration {
    const token = process.env.VERCEL_TOKEN?.trim();
    const projectIdOrName = (process.env.VERCEL_PROJECT_ID_OR_NAME || process.env.VERCEL_PROJECT_ID || '').trim();
    const teamId = process.env.VERCEL_TEAM_ID?.trim() || undefined;

    if (!token || !projectIdOrName) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot sync Vercel domains because \`VERCEL_TOKEN\` and \`VERCEL_PROJECT_ID_OR_NAME\` (or \`VERCEL_PROJECT_ID\`) are required.
            `),
        );
    }

    return {
        token,
        projectIdOrName,
        teamId,
    };
}

/**
 * Loads the Vercel project metadata required for domain/environment binding decisions.
 *
 * @param configuration - Vercel API configuration.
 * @returns Normalized project metadata.
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
 * Builds the desired/current domain diff for Vercel synchronization.
 *
 * @param options - Registered servers and current project domains.
 * @returns Sync plan derived from normalized domain sets.
 */
export function createVercelDomainSyncPlan(options: {
    readonly registeredServers: ReadonlyArray<ServerRecord>;
    readonly projectMetadata: VercelProjectMetadata;
    readonly projectDomains: ReadonlyArray<VercelProjectDomain>;
}): VercelDomainSyncPlan {
    const desiredProjectDomains = uniqueDesiredProjectDomains(
        options.registeredServers.map((server) =>
            resolveDesiredProjectDomain(server, {
                projectMetadata: options.projectMetadata,
                projectDomains: options.projectDomains,
            }),
        ),
    );
    const desiredDomains = desiredProjectDomains.map((domain) => domain.name);
    const projectDomainByName = new Map<string, VercelProjectDomain>();
    const ignoredDomains: Array<string> = [];

    for (const projectDomain of options.projectDomains) {
        const normalizedDomain = normalizeManagedDomain(projectDomain.name);
        if (isIgnoredProjectDomain(normalizedDomain)) {
            ignoredDomains.push(normalizedDomain);
            continue;
        }
        if (projectDomainByName.has(normalizedDomain)) {
            throw new DatabaseError(
                spaceTrim(`
                    Encountered duplicate Vercel project domain entry for \`${normalizedDomain}\`.
                `),
            );
        }
        projectDomainByName.set(normalizedDomain, projectDomain);
    }

    const projectDomainsToManage = Array.from(projectDomainByName.keys());
    const domainsToAdd: Array<DesiredVercelProjectDomain> = [];
    const domainsToVerify: Array<string> = [];
    const domainsToReconfigure: Array<VercelDomainReconfiguration> = [];

    for (const desiredDomain of desiredProjectDomains) {
        const currentDomain = projectDomainByName.get(desiredDomain.name);

        if (!currentDomain) {
            domainsToAdd.push(desiredDomain);
            continue;
        }

        const reconfigurationReasons = describeDomainReconfigurationReasons(currentDomain, desiredDomain);
        if (reconfigurationReasons.length > 0) {
            domainsToReconfigure.push({
                currentDomain,
                desiredDomain,
                reasons: reconfigurationReasons,
            });
            continue;
        }

        if (currentDomain.verified === false) {
            domainsToVerify.push(desiredDomain.name);
        }
    }

    const domainsToFlag = projectDomainsToManage.filter((domain) => !desiredDomains.includes(domain));

    return {
        desiredDomains,
        domainsToAdd,
        domainsToVerify,
        domainsToReconfigure,
        domainsToFlag,
        ignoredDomains,
    };
}

/**
 * Resolves the desired Vercel binding for one `_Server` row.
 *
 * @param server - Registered server row.
 * @param options - Project metadata needed for environment mapping.
 * @returns Desired Vercel domain configuration.
 */
export function resolveDesiredProjectDomain(
    server: Pick<ServerRecord, 'domain' | 'environment'>,
    options: {
        readonly projectMetadata: VercelProjectMetadata;
        readonly projectDomains?: ReadonlyArray<VercelProjectDomain>;
    },
): DesiredVercelProjectDomain {
    const normalizedDomain = normalizeManagedDomain(server.domain);

    switch (server.environment) {
        case SERVER_ENVIRONMENT.PRODUCTION: {
            const productionBranch = normalizeGitBranch(options.projectMetadata.productionBranch);
            if (productionBranch !== SERVER_ENVIRONMENT_VERCEL_BINDINGS[SERVER_ENVIRONMENT.PRODUCTION].gitBranch) {
                throw new DatabaseError(
                    spaceTrim(`
                        Cannot map \`${normalizedDomain}\` from \`${
                        SERVER_ENVIRONMENT.PRODUCTION
                    }\` to Vercel \`Production\`.

                        Expected the Vercel production branch to be \`${
                            SERVER_ENVIRONMENT_VERCEL_BINDINGS[SERVER_ENVIRONMENT.PRODUCTION].gitBranch
                        }\`,
                        but the project is configured with \`${options.projectMetadata.productionBranch || '<empty>'}\`.
                    `),
                );
            }

            return {
                name: normalizedDomain,
                sourceEnvironment: server.environment,
                vercelEnvironmentName:
                    SERVER_ENVIRONMENT_VERCEL_BINDINGS[SERVER_ENVIRONMENT.PRODUCTION].vercelEnvironmentName,
            };
        }

        case SERVER_ENVIRONMENT.PREVIEW:
        case SERVER_ENVIRONMENT.LIVE:
            return resolveBranchBoundDesiredProjectDomain(
                normalizedDomain,
                server.environment,
                options.projectMetadata,
            );

        case SERVER_ENVIRONMENT.LTS: {
            const binding = SERVER_ENVIRONMENT_VERCEL_BINDINGS[SERVER_ENVIRONMENT.LTS];
            const customEnvironmentId = resolveCustomEnvironmentId(binding.customEnvironmentLookupName, {
                projectMetadata: options.projectMetadata,
                projectDomains: options.projectDomains,
            });

            return {
                name: normalizedDomain,
                sourceEnvironment: server.environment,
                vercelEnvironmentName: binding.vercelEnvironmentName,
                gitBranch: binding.gitBranch,
                customEnvironmentId,
            };
        }

        default:
            return assertNever(server.environment);
    }
}

/**
 * Lists all project domains currently configured on Vercel.
 *
 * @param configuration - Vercel API configuration.
 * @returns Current project domains.
 * @private function of `sync-vercel-domains`
 */
export async function listProjectDomains(configuration: VercelApiConfiguration): Promise<Array<VercelProjectDomain>> {
    const domains: Array<VercelProjectDomain> = [];
    let until: number | null = null;
    const seenPaginationCursors = new Set<number>();
    let hasMorePages = true;

    while (hasMorePages) {
        const searchParams = new URLSearchParams({ limit: '100' });
        if (configuration.teamId) {
            searchParams.set('teamId', configuration.teamId);
        }
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

/**
 * Adds one missing domain to the Vercel project.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Domain to attach to the project.
 * @returns Created/attached Vercel project domain.
 * @private function of `sync-vercel-domains`
 */
export async function addProjectDomain(
    configuration: VercelApiConfiguration,
    domain: DesiredVercelProjectDomain,
): Promise<VercelProjectDomain> {
    const body: Record<string, unknown> = { name: domain.name };

    if (domain.gitBranch) {
        body.gitBranch = domain.gitBranch;
    }
    if (domain.customEnvironmentId) {
        body.customEnvironmentId = domain.customEnvironmentId;
    }

    return requestVercel<VercelProjectDomain>({
        configuration,
        method: 'POST',
        pathname: `/v10/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains`,
        body,
    });
}

/**
 * Requests Vercel verification for one project domain.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Domain to verify.
 * @private function of `sync-vercel-domains`
 */
export async function verifyProjectDomain(configuration: VercelApiConfiguration, domain: string): Promise<void> {
    await requestVercel({
        configuration,
        method: 'POST',
        pathname: `/v9/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains/${encodeURIComponent(
            domain,
        )}/verify`,
    });
}

/**
 * Removes one stale domain from the Vercel project.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Domain to remove.
 * @private function of `sync-vercel-domains`
 */
export async function removeProjectDomain(configuration: VercelApiConfiguration, domain: string): Promise<void> {
    await requestVercel({
        configuration,
        method: 'DELETE',
        pathname: `/v9/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains/${encodeURIComponent(
            domain,
        )}`,
    });
}

/**
 * Gets Vercel DNS recommendations for one domain.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Managed domain name.
 * @returns Vercel domain DNS recommendations.
 * @private function of `sync-vercel-domains`
 */
export async function getVercelDomainConfiguration(
    configuration: VercelApiConfiguration,
    domain: string,
): Promise<VercelDomainConfiguration> {
    const searchParams = new URLSearchParams();
    searchParams.set('projectIdOrName', configuration.projectIdOrName);

    return requestVercel<VercelDomainConfiguration>({
        configuration,
        method: 'GET',
        pathname: `/v6/domains/${encodeURIComponent(domain)}/config`,
        searchParams,
    });
}

/**
 * Normalizes the branch/custom-environment binding for one Vercel domain-like payload.
 *
 * @param domain - Existing or desired domain payload.
 * @returns Normalized branch/custom-environment binding.
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
 * Executes one Vercel API request and parses the JSON response.
 *
 * @param options - HTTP request options.
 * @returns Parsed JSON response body.
 */
async function requestVercel<TResponse = Record<string, unknown>>(options: {
    readonly configuration: VercelApiConfiguration;
    readonly method: 'GET' | 'POST' | 'DELETE';
    readonly pathname: string;
    readonly searchParams?: URLSearchParams;
    readonly body?: Record<string, unknown>;
}): Promise<TResponse> {
    const url = new URL(options.pathname, VERCEL_API_BASE_URL);
    const searchParams = new URLSearchParams(options.searchParams);
    if (options.configuration.teamId) {
        searchParams.set('teamId', options.configuration.teamId);
    }
    const serializedSearchParams = searchParams.toString();
    if (serializedSearchParams) {
        url.search = serializedSearchParams;
    }

    const response = await fetch(url, {
        method: options.method,
        headers: {
            Authorization: `Bearer ${options.configuration.token}`,
            'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new DatabaseError(
            spaceTrim(`
                Vercel API request failed.

                Method: \`${options.method}\`
                URL: \`${url.toString()}\`
                Status: \`${response.status}\`
                Response: \`${responseText || '<empty>'}\`
            `),
        );
    }

    if (response.status === HTTP_STATUS_NO_CONTENT) {
        return {} as TResponse;
    }

    return (await response.json()) as TResponse;
}

/**
 * Deduplicates desired project-domain bindings while preserving their original order.
 *
 * @param domains - Desired domain bindings.
 * @returns Unique desired domain bindings.
 */
function uniqueDesiredProjectDomains(
    domains: ReadonlyArray<DesiredVercelProjectDomain>,
): Array<DesiredVercelProjectDomain> {
    const result: Array<DesiredVercelProjectDomain> = [];

    for (const domain of domains) {
        if (!result.some((existingDomain) => existingDomain.name === domain.name)) {
            result.push(domain);
        }
    }

    return result;
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

/**
 * Resolves the desired binding for branch-based Vercel environments.
 *
 * @param normalizedDomain - Normalized domain.
 * @param environment - Source `_Server.environment`.
 * @param projectMetadata - Vercel project metadata.
 * @returns Desired Vercel domain configuration.
 */
function resolveBranchBoundDesiredProjectDomain(
    normalizedDomain: string,
    environment: Extract<ServerEnvironment, 'PREVIEW' | 'LIVE'>,
    projectMetadata: VercelProjectMetadata,
): DesiredVercelProjectDomain {
    const binding = SERVER_ENVIRONMENT_VERCEL_BINDINGS[environment];
    const normalizedProductionBranch = normalizeGitBranch(projectMetadata.productionBranch);

    if (normalizedProductionBranch === normalizeGitBranch(binding.gitBranch)) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot map \`${normalizedDomain}\` from \`${environment}\` to Vercel \`${binding.vercelEnvironmentName}\`.

                The mapped branch \`${binding.gitBranch}\` is configured as the Vercel production branch,
                so it cannot be attached as a branch-specific custom domain.
            `),
        );
    }

    return {
        name: normalizedDomain,
        sourceEnvironment: environment,
        vercelEnvironmentName: binding.vercelEnvironmentName,
        gitBranch: binding.gitBranch,
    };
}

/**
 * Resolves the custom-environment id used for one `_Server.environment` mapping.
 *
 * @param environmentName - Expected custom-environment slug/name.
 * @param options - Project metadata and current domains.
 * @returns Matching custom-environment id.
 */
function resolveCustomEnvironmentId(
    environmentName: string,
    options: {
        readonly projectMetadata: VercelProjectMetadata;
        readonly projectDomains?: ReadonlyArray<VercelProjectDomain>;
    },
): string {
    const normalizedEnvironmentName = normalizeEnvironmentIdentifier(environmentName);

    const matchingCustomEnvironment = options.projectMetadata.customEnvironments.find((customEnvironment) =>
        [customEnvironment.id, customEnvironment.slug, customEnvironment.name]
            .filter((candidate): candidate is string => Boolean(candidate))
            .some((candidate) => normalizeEnvironmentIdentifier(candidate) === normalizedEnvironmentName),
    );
    if (matchingCustomEnvironment) {
        return matchingCustomEnvironment.id;
    }

    const matchingDomain = (options.projectDomains || []).find(
        (projectDomain) =>
            normalizeGitBranch(projectDomain.gitBranch) === normalizedEnvironmentName &&
            normalizeCustomEnvironmentId(projectDomain.customEnvironmentId) !== null,
    );
    if (matchingDomain?.customEnvironmentId) {
        return matchingDomain.customEnvironmentId;
    }

    const fallbackEnvironmentVariable =
        process.env.VERCEL_CUSTOM_ENVIRONMENT_ID_LTS?.trim() || process.env.VERCEL_LTS_CUSTOM_ENVIRONMENT_ID?.trim();
    if (normalizedEnvironmentName === 'lts' && fallbackEnvironmentVariable) {
        return fallbackEnvironmentVariable;
    }

    throw new DatabaseError(
        spaceTrim(`
            Failed to resolve the Vercel custom environment for \`${environmentName}\`.

            Expected a custom environment named \`${environmentName}\` on the Vercel project,
            or an existing project domain already bound to that custom environment.
        `),
    );
}

/**
 * Lists human-readable reasons why an existing Vercel domain binding must be reconfigured.
 *
 * @param currentDomain - Existing Vercel project domain.
 * @param desiredDomain - Desired Vercel project domain derived from `_Server`.
 * @returns Reconfiguration reasons.
 */
function describeDomainReconfigurationReasons(
    currentDomain: VercelProjectDomain,
    desiredDomain: DesiredVercelProjectDomain,
): Array<string> {
    const currentBinding = normalizeVercelDomainBinding(currentDomain);
    const desiredBinding = normalizeVercelDomainBinding(desiredDomain);
    const reasons: Array<string> = [];

    if (currentBinding.gitBranch !== desiredBinding.gitBranch) {
        reasons.push(
            `gitBranch ${formatNullableValue(currentBinding.gitBranch)} -> ${formatNullableValue(
                desiredBinding.gitBranch,
            )}`,
        );
    }

    if (currentBinding.customEnvironmentId !== desiredBinding.customEnvironmentId) {
        reasons.push(
            `customEnvironmentId ${formatNullableValue(currentBinding.customEnvironmentId)} -> ${formatNullableValue(
                desiredBinding.customEnvironmentId,
            )}`,
        );
    }

    return reasons;
}

/**
 * Normalizes one optional git branch.
 *
 * @param gitBranch - Raw git branch.
 * @returns Normalized git branch or `null`.
 */
function normalizeGitBranch(gitBranch: string | null | undefined): string | null {
    const normalizedGitBranch = typeof gitBranch === 'string' ? gitBranch.trim() : '';
    return normalizedGitBranch || null;
}

/**
 * Normalizes one optional custom-environment id.
 *
 * @param customEnvironmentId - Raw custom-environment id.
 * @returns Normalized id or `null`.
 */
function normalizeCustomEnvironmentId(customEnvironmentId: string | null | undefined): string | null {
    const normalizedCustomEnvironmentId = typeof customEnvironmentId === 'string' ? customEnvironmentId.trim() : '';
    return normalizedCustomEnvironmentId || null;
}

/**
 * Normalizes one Vercel custom-environment identifier for matching.
 *
 * @param value - Raw environment identifier.
 * @returns Normalized identifier.
 */
function normalizeEnvironmentIdentifier(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Formats one nullable diagnostic value.
 *
 * @param value - Raw value.
 * @returns Display-friendly placeholder or value.
 */
function formatNullableValue(value: string | null): string {
    return value === null ? '<none>' : value;
}

/**
 * Exhaustiveness guard for impossible `_Server.environment` branches.
 *
 * @param value - Impossible runtime value.
 * @returns Never returns.
 */
function assertNever(value: never): never {
    throw new DatabaseError(
        spaceTrim(`
            Encountered an unsupported server environment during Vercel sync: \`${String(value)}\`.
        `),
    );
}

/**
 * Checks whether the project domain should be ignored by sync deletion/flagging.
 *
 * @param domain - Normalized domain.
 * @returns `true` when the domain is managed by Vercel platform defaults.
 */
function isIgnoredProjectDomain(domain: string): boolean {
    return domain.endsWith(VERCEL_PLATFORM_DOMAIN_SUFFIX);
}
