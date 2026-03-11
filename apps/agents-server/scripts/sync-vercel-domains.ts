import { Client } from 'pg';
import * as dotenv from 'dotenv';
import spaceTrim from 'spacetrim';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { resolveDatabaseMigrationConnectionStringFromEnvironment } from '../src/database/runDatabaseMigrations';
import { listRegisteredServersFromDatabase } from '../src/database/listRegisteredServersFromDatabase';
import { normalizeDomainForMatching } from '../../../src/utils/validators/url/normalizeDomainForMatching';

dotenv.config();

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
 * CLI options controlling one `_Server` -> Vercel sync run.
 */
type SyncVercelDomainsOptions = {
    /**
     * When true, only logs planned changes without mutating Vercel.
     */
    readonly dryRun: boolean;
    /**
     * When true, removes Vercel project domains that are no longer present in `_Server`.
     */
    readonly deleteRemoved: boolean;
};

/**
 * Minimal Vercel project-domain payload used by the sync script.
 */
type VercelProjectDomain = {
    /**
     * Domain name registered on the Vercel project.
     */
    readonly name: string;
    /**
     * Whether the domain is already verified by Vercel.
     */
    readonly verified?: boolean;
};

/**
 * Diff between `_Server` domains and current Vercel project domains.
 */
type VercelDomainSyncPlan = {
    /**
     * Normalized domains required by `_Server`.
     */
    readonly desiredDomains: ReadonlyArray<string>;
    /**
     * Project domains that should be added on Vercel.
     */
    readonly domainsToAdd: ReadonlyArray<string>;
    /**
     * Existing project domains that should be verified.
     */
    readonly domainsToVerify: ReadonlyArray<string>;
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
 */
type VercelApiConfiguration = {
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
 * Executes the `_Server` -> Vercel domain sync.
 */
async function main(): Promise<void> {
    const options = parseCliOptions(process.argv.slice(2));
    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();

    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot sync Vercel domains because \`POSTGRES_URL\` / \`DATABASE_URL\` is missing.
            `),
        );
    }

    const registeredServers = await loadRegisteredServers(connectionString);
    if (registeredServers.length === 0) {
        throw new DatabaseError(
            spaceTrim(`
                Refusing to sync Vercel domains because \`_Server\` contains no rows.
            `),
        );
    }

    const vercelConfiguration = loadVercelApiConfiguration();
    const projectDomains = await listProjectDomains(vercelConfiguration);
    const syncPlan = createVercelDomainSyncPlan({
        registeredServers,
        projectDomains,
    });

    logSyncEvent('info', 'server_registry_loaded', {
        count: registeredServers.length,
        dryRun: options.dryRun,
    });
    logSyncEvent('info', 'vercel_project_domains_loaded', {
        count: projectDomains.length,
        ignoredCount: syncPlan.ignoredDomains.length,
        dryRun: options.dryRun,
    });

    for (const domain of syncPlan.domainsToAdd) {
        if (options.dryRun) {
            logSyncEvent('info', 'domain_add_planned', { domain, dryRun: true });
            continue;
        }

        const addedDomain = await addProjectDomain(vercelConfiguration, domain);
        logSyncEvent('info', 'domain_added', {
            domain,
            verified: addedDomain.verified ?? null,
            dryRun: false,
        });

        if (addedDomain.verified === false) {
            await verifyProjectDomain(vercelConfiguration, domain);
            logSyncEvent('info', 'domain_verified', {
                domain,
                dryRun: false,
            });
        }
    }

    for (const domain of syncPlan.domainsToVerify) {
        if (options.dryRun) {
            logSyncEvent('info', 'domain_verify_planned', { domain, dryRun: true });
            continue;
        }

        await verifyProjectDomain(vercelConfiguration, domain);
        logSyncEvent('info', 'domain_verified', {
            domain,
            dryRun: false,
        });
    }

    for (const domain of syncPlan.domainsToFlag) {
        if (!options.deleteRemoved) {
            logSyncEvent('warn', 'domain_flagged_removed_from_registry', {
                domain,
                dryRun: options.dryRun,
            });
            continue;
        }

        if (options.dryRun) {
            logSyncEvent('info', 'domain_delete_planned', { domain, dryRun: true });
            continue;
        }

        await removeProjectDomain(vercelConfiguration, domain);
        logSyncEvent('info', 'domain_deleted', {
            domain,
            dryRun: false,
        });
    }

    logSyncEvent('info', 'sync_completed', {
        desiredCount: syncPlan.desiredDomains.length,
        addedCount: syncPlan.domainsToAdd.length,
        verifyCount: syncPlan.domainsToVerify.length,
        flaggedCount: syncPlan.domainsToFlag.length,
        ignoredCount: syncPlan.ignoredDomains.length,
        deleteRemoved: options.deleteRemoved,
        dryRun: options.dryRun,
    });
}

/**
 * Parses sync CLI flags.
 *
 * @param args - CLI arguments.
 * @returns Parsed sync options.
 */
function parseCliOptions(args: ReadonlyArray<string>): SyncVercelDomainsOptions {
    return {
        dryRun: args.includes('--dry-run'),
        deleteRemoved: args.includes('--delete-removed'),
    };
}

/**
 * Loads all registered servers from the global `_Server` table.
 *
 * @param connectionString - PostgreSQL connection string.
 * @returns Registered servers ordered by name.
 */
async function loadRegisteredServers(connectionString: string) {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        return await listRegisteredServersFromDatabase(client);
    } finally {
        await client.end();
    }
}

/**
 * Loads Vercel API configuration from environment variables.
 *
 * @returns Validated Vercel API configuration.
 */
function loadVercelApiConfiguration(): VercelApiConfiguration {
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
 * Builds the desired/current domain diff for Vercel synchronization.
 *
 * @param options - Registered servers and current project domains.
 * @returns Sync plan derived from normalized domain sets.
 */
function createVercelDomainSyncPlan(options: {
    readonly registeredServers: ReadonlyArray<{ domain: string }>;
    readonly projectDomains: ReadonlyArray<VercelProjectDomain>;
}): VercelDomainSyncPlan {
    const desiredDomains = uniqueDomains(options.registeredServers.map((server) => normalizeManagedDomain(server.domain)));
    const projectDomainByName = new Map<string, VercelProjectDomain>();
    const ignoredDomains: Array<string> = [];

    for (const projectDomain of options.projectDomains) {
        const normalizedDomain = normalizeManagedDomain(projectDomain.name);
        if (isIgnoredProjectDomain(normalizedDomain)) {
            ignoredDomains.push(normalizedDomain);
            continue;
        }
        projectDomainByName.set(normalizedDomain, projectDomain);
    }

    const projectDomainsToManage = Array.from(projectDomainByName.keys());
    const domainsToAdd = desiredDomains.filter((domain) => !projectDomainByName.has(domain));
    const domainsToVerify = desiredDomains.filter((domain) => projectDomainByName.get(domain)?.verified === false);
    const domainsToFlag = projectDomainsToManage.filter((domain) => !desiredDomains.includes(domain));

    return {
        desiredDomains,
        domainsToAdd,
        domainsToVerify,
        domainsToFlag,
        ignoredDomains,
    };
}

/**
 * Lists all project domains currently configured on Vercel.
 *
 * @param configuration - Vercel API configuration.
 * @returns Current project domains.
 */
async function listProjectDomains(configuration: VercelApiConfiguration): Promise<Array<VercelProjectDomain>> {
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
 */
async function addProjectDomain(
    configuration: VercelApiConfiguration,
    domain: string,
): Promise<VercelProjectDomain> {
    return requestVercel<VercelProjectDomain>({
        configuration,
        method: 'POST',
        pathname: `/v10/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains`,
        body: { name: domain },
    });
}

/**
 * Requests Vercel verification for one project domain.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Domain to verify.
 */
async function verifyProjectDomain(configuration: VercelApiConfiguration, domain: string): Promise<void> {
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
 */
async function removeProjectDomain(configuration: VercelApiConfiguration, domain: string): Promise<void> {
    await requestVercel({
        configuration,
        method: 'DELETE',
        pathname: `/v9/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains/${encodeURIComponent(
            domain,
        )}`,
    });
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
    if (searchParams.size > 0) {
        url.search = searchParams.toString();
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
 * Writes one CI-friendly JSON log line.
 *
 * @param level - Log severity.
 * @param event - Stable event name.
 * @param payload - Event payload.
 */
function logSyncEvent(level: 'info' | 'warn' | 'error', event: string, payload: Record<string, unknown>): void {
    console.log(
        JSON.stringify({
            level,
            event,
            timestamp: new Date().toISOString(),
            ...payload,
        }),
    );
}

/**
 * Normalizes one managed domain from `_Server` or Vercel.
 *
 * @param domain - Raw domain string.
 * @returns Normalized domain.
 */
function normalizeManagedDomain(domain: string): string {
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

/**
 * Deduplicates domains while preserving their original order.
 *
 * @param domains - Raw domains.
 * @returns Unique normalized domains.
 */
function uniqueDomains(domains: ReadonlyArray<string>): Array<string> {
    const result: Array<string> = [];

    for (const domain of domains) {
        if (!result.includes(domain)) {
            result.push(domain);
        }
    }

    return result;
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

main().catch((error) => {
    logSyncEvent('error', 'sync_failed', {
        message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
});
