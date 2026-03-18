import colors from 'colors';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import spaceTrim from 'spacetrim';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { normalizeDomainForMatching } from '../../../src/utils/validators/url/normalizeDomainForMatching';
import { listRegisteredServersFromDatabase } from '../src/database/listRegisteredServersFromDatabase';
import { resolveDatabaseMigrationConnectionStringFromEnvironment } from '../src/database/runDatabaseMigrations';
import { SERVER_ENVIRONMENT, type ServerEnvironment, type ServerRecord } from '../src/utils/serverRegistry';

dotenv.config();

/**
 * Default Vercel API base URL.
 */
const VERCEL_API_BASE_URL = 'https://api.vercel.com';

/**
 * Default Cloudflare API base URL.
 */
const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

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
 * Maximum number of Cloudflare zones loaded from one API page.
 */
const CLOUDFLARE_ZONES_PAGE_LIMIT = 100;

/**
 * Maximum number of Cloudflare DNS records loaded from one API page.
 */
const CLOUDFLARE_DNS_RECORDS_PAGE_LIMIT = 100;

/**
 * Cloudflare DNS records created/updated by this script are marked by this visible comment fragment.
 */
const CLOUDFLARE_DNS_RECORD_COMMENT_MARKER = 'Managed by Promptbook sync-vercel-domains.ts';

/**
 * Cloudflare DNS records created/updated by this script are tagged with this stable tag.
 */
const CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG = 'managed-by:promptbook-sync-vercel-domains';

/**
 * Cloudflare DNS records should not be proxied because Vercel must see the original DNS target directly.
 */
const CLOUDFLARE_DNS_RECORD_PROXIED = false;

/**
 * Cloudflare TTL `1` means automatic.
 */
const CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC = 1;

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
 * Human-readable report section shown after one sync run in interactive terminals.
 */
type HumanReadableReportSection = {
    /**
     * Stable section key.
     */
    readonly key: string;
    /**
     * Optional short explanation shown under the section title.
     */
    readonly description?: string;
    /**
     * Colorized section title suffix.
     */
    readonly label: string;
    /**
     * Colorized item prefix.
     */
    readonly bullet: string;
    /**
     * Lines rendered under the section.
     */
    readonly lines: ReadonlyArray<string>;
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
 */
type DesiredVercelProjectDomain = {
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
 */
type VercelDomainReconfiguration = {
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
 */
type VercelDomainSyncPlan = {
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
 * Minimal custom-environment metadata required for LTS domain routing.
 */
type VercelCustomEnvironment = {
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
 */
type VercelProjectMetadata = {
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
 */
type VercelDomainConfiguration = {
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
 * Cloudflare API configuration loaded from environment variables.
 */
type CloudflareApiConfiguration = {
    /**
     * API token used for authentication.
     */
    readonly token: string;
};

/**
 * Minimal Cloudflare zone metadata used for domain-to-zone matching.
 */
type CloudflareZone = {
    /**
     * Cloudflare zone id.
     */
    readonly id: string;
    /**
     * Zone apex name.
     */
    readonly name: string;
};

/**
 * Minimal Cloudflare DNS record payload used by the sync script.
 */
type CloudflareDnsRecord = {
    /**
     * Cloudflare DNS record id.
     */
    readonly id: string;
    /**
     * DNS record type.
     */
    readonly type: string;
    /**
     * Fully qualified record name.
     */
    readonly name: string;
    /**
     * Record content/target.
     */
    readonly content: string;
    /**
     * Whether the record is proxied through Cloudflare.
     */
    readonly proxied?: boolean | null;
    /**
     * Record TTL.
     */
    readonly ttl?: number | null;
    /**
     * Optional user-visible record comment.
     */
    readonly comment?: string | null;
    /**
     * Optional record tags.
     */
    readonly tags?: ReadonlyArray<string>;
};

/**
 * Desired Cloudflare DNS record derived from one managed domain.
 */
type DesiredCloudflareDnsRecord = {
    /**
     * Zone id containing the DNS record.
     */
    readonly zoneId: string;
    /**
     * Human-readable zone name.
     */
    readonly zoneName: string;
    /**
     * Fully qualified record name.
     */
    readonly name: string;
    /**
     * DNS record type.
     */
    readonly type: 'A' | 'CNAME';
    /**
     * Record content/target.
     */
    readonly content: string;
    /**
     * Whether the record is proxied through Cloudflare.
     */
    readonly proxied: boolean;
    /**
     * Record TTL.
     */
    readonly ttl: number;
    /**
     * Comment to apply on newly created records.
     */
    readonly comment: string;
    /**
     * Tags to apply on newly created records.
     */
    readonly tags: ReadonlyArray<string>;
};

/**
 * Cloudflare DNS record update step.
 */
type CloudflareDnsRecordUpdate = {
    /**
     * Existing Cloudflare DNS record.
     */
    readonly currentRecord: CloudflareDnsRecord;
    /**
     * Desired Cloudflare DNS record.
     */
    readonly desiredRecord: DesiredCloudflareDnsRecord;
    /**
     * Human-readable mismatch reasons.
     */
    readonly reasons: ReadonlyArray<string>;
};

/**
 * Managed domain skipped during Cloudflare sync planning.
 */
type CloudflareSkippedDomain = {
    /**
     * Managed domain that was skipped.
     */
    readonly domain: string;
    /**
     * Human-readable reason.
     */
    readonly reason: string;
};

/**
 * Diff between desired Cloudflare DNS records and current zone records.
 */
type CloudflareDnsRecordSyncPlan = {
    /**
     * DNS records that should be created.
     */
    readonly recordsToCreate: ReadonlyArray<DesiredCloudflareDnsRecord>;
    /**
     * DNS records that should be updated.
     */
    readonly recordsToUpdate: ReadonlyArray<CloudflareDnsRecordUpdate>;
    /**
     * Managed domains skipped because the zone/record situation was unsafe or unsupported.
     */
    readonly skippedDomains: ReadonlyArray<CloudflareSkippedDomain>;
};

/**
 * Generic paginated Cloudflare API envelope.
 */
type CloudflareApiEnvelope<TResult> = {
    /**
     * Whether the API call succeeded.
     */
    readonly success: boolean;
    /**
     * Response payload.
     */
    readonly result: TResult;
    /**
     * Pagination metadata.
     */
    readonly result_info?: {
        /**
         * Current page number.
         */
        readonly page?: number;
        /**
         * Total number of pages.
         */
        readonly total_pages?: number;
    };
    /**
     * API error payloads.
     */
    readonly errors?: ReadonlyArray<Record<string, unknown>>;
};

/**
 * Cloudflare sync configuration resolution.
 */
type CloudflareSyncConfigurationResolution = {
    /**
     * Loaded configuration when sync is enabled.
     */
    readonly configuration: CloudflareApiConfiguration | null;
    /**
     * Human-readable skip reason when sync is disabled or unconfigured.
     */
    readonly skippedReason: string | null;
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
    const projectMetadata = await loadProjectMetadata(vercelConfiguration);
    const projectDomains = await listProjectDomains(vercelConfiguration);
    const syncPlan = createVercelDomainSyncPlan({
        registeredServers,
        projectMetadata,
        projectDomains,
    });
    let cloudflareSyncPlan: CloudflareDnsRecordSyncPlan | null = null;
    let cloudflareSyncSkippedReason: string | null = null;

    logSyncEvent('info', 'server_registry_loaded', {
        count: registeredServers.length,
        dryRun: options.dryRun,
    });
    logSyncEvent('info', 'vercel_project_domains_loaded', {
        count: projectDomains.length,
        ignoredCount: syncPlan.ignoredDomains.length,
        dryRun: options.dryRun,
    });
    logSyncEvent('info', 'vercel_project_loaded', {
        productionBranch: projectMetadata.productionBranch,
        customEnvironmentCount: projectMetadata.customEnvironments.length,
        dryRun: options.dryRun,
    });

    for (const reconfiguration of syncPlan.domainsToReconfigure) {
        const currentBinding = normalizeVercelDomainBinding(reconfiguration.currentDomain);
        const desiredBinding = normalizeVercelDomainBinding(reconfiguration.desiredDomain);

        if (options.dryRun) {
            logSyncEvent('info', 'domain_reconfigure_planned', {
                domain: reconfiguration.desiredDomain.name,
                sourceEnvironment: reconfiguration.desiredDomain.sourceEnvironment,
                vercelEnvironment: reconfiguration.desiredDomain.vercelEnvironmentName,
                currentGitBranch: currentBinding.gitBranch,
                currentCustomEnvironmentId: currentBinding.customEnvironmentId,
                desiredGitBranch: desiredBinding.gitBranch,
                desiredCustomEnvironmentId: desiredBinding.customEnvironmentId,
                reasons: reconfiguration.reasons,
                dryRun: true,
            });
            continue;
        }

        await removeProjectDomain(vercelConfiguration, reconfiguration.currentDomain.name);
        logSyncEvent('info', 'domain_deleted_for_reconfigure', {
            domain: reconfiguration.currentDomain.name,
            dryRun: false,
        });

        const addedDomain = await addProjectDomain(vercelConfiguration, reconfiguration.desiredDomain);
        logSyncEvent('info', 'domain_reconfigured', {
            domain: reconfiguration.desiredDomain.name,
            sourceEnvironment: reconfiguration.desiredDomain.sourceEnvironment,
            vercelEnvironment: reconfiguration.desiredDomain.vercelEnvironmentName,
            gitBranch: reconfiguration.desiredDomain.gitBranch ?? null,
            customEnvironmentId: reconfiguration.desiredDomain.customEnvironmentId ?? null,
            verified: addedDomain.verified ?? null,
            dryRun: false,
        });

        if (addedDomain.verified === false) {
            await verifyProjectDomain(vercelConfiguration, reconfiguration.desiredDomain.name);
            logSyncEvent('info', 'domain_verified', {
                domain: reconfiguration.desiredDomain.name,
                dryRun: false,
            });
        }
    }

    for (const desiredDomain of syncPlan.domainsToAdd) {
        if (options.dryRun) {
            logSyncEvent('info', 'domain_add_planned', {
                domain: desiredDomain.name,
                sourceEnvironment: desiredDomain.sourceEnvironment,
                vercelEnvironment: desiredDomain.vercelEnvironmentName,
                gitBranch: desiredDomain.gitBranch ?? null,
                customEnvironmentId: desiredDomain.customEnvironmentId ?? null,
                dryRun: true,
            });
            continue;
        }

        const addedDomain = await addProjectDomain(vercelConfiguration, desiredDomain);
        logSyncEvent('info', 'domain_added', {
            domain: desiredDomain.name,
            sourceEnvironment: desiredDomain.sourceEnvironment,
            vercelEnvironment: desiredDomain.vercelEnvironmentName,
            gitBranch: desiredDomain.gitBranch ?? null,
            customEnvironmentId: desiredDomain.customEnvironmentId ?? null,
            verified: addedDomain.verified ?? null,
            dryRun: false,
        });

        if (addedDomain.verified === false) {
            await verifyProjectDomain(vercelConfiguration, desiredDomain.name);
            logSyncEvent('info', 'domain_verified', {
                domain: desiredDomain.name,
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

    const cloudflareSyncConfigurationResolution = resolveCloudflareSyncConfiguration();
    if (cloudflareSyncConfigurationResolution.configuration) {
        cloudflareSyncPlan = await syncCloudflareDnsRecords({
            cloudflareConfiguration: cloudflareSyncConfigurationResolution.configuration,
            vercelConfiguration,
            desiredDomains: syncPlan.desiredDomains,
            dryRun: options.dryRun,
        });
    } else {
        cloudflareSyncSkippedReason = cloudflareSyncConfigurationResolution.skippedReason;
        logSyncEvent('warn', 'cloudflare_sync_skipped', {
            reason: cloudflareSyncSkippedReason,
            dryRun: options.dryRun,
        });
    }

    logSyncEvent('info', 'sync_completed', {
        desiredCount: syncPlan.desiredDomains.length,
        addedCount: syncPlan.domainsToAdd.length,
        verifyCount: syncPlan.domainsToVerify.length,
        reconfiguredCount: syncPlan.domainsToReconfigure.length,
        flaggedCount: syncPlan.domainsToFlag.length,
        ignoredCount: syncPlan.ignoredDomains.length,
        cloudflareCreatedCount: cloudflareSyncPlan?.recordsToCreate.length ?? 0,
        cloudflareUpdatedCount: cloudflareSyncPlan?.recordsToUpdate.length ?? 0,
        cloudflareSkippedCount: cloudflareSyncPlan?.skippedDomains.length ?? 0,
        cloudflareSyncSkippedReason,
        deleteRemoved: options.deleteRemoved,
        dryRun: options.dryRun,
    });

    printHumanReadableSyncReport({
        options,
        projectMetadata,
        syncPlan,
        cloudflareSyncPlan,
        cloudflareSyncSkippedReason,
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
 * Loads the Vercel project metadata required for domain/environment binding decisions.
 *
 * @param configuration - Vercel API configuration.
 * @returns Normalized project metadata.
 */
async function loadProjectMetadata(configuration: VercelApiConfiguration): Promise<VercelProjectMetadata> {
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
 * Resolves optional Cloudflare sync configuration from environment variables.
 *
 * @returns Loaded configuration or a human-readable skip reason.
 */
function resolveCloudflareSyncConfiguration(): CloudflareSyncConfigurationResolution {
    if (process.env.PROMPTBOOK_SYNC_CLOUDFLARE === 'false') {
        return {
            configuration: null,
            skippedReason: 'Cloudflare sync disabled by `PROMPTBOOK_SYNC_CLOUDFLARE=false`.',
        };
    }

    const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
    if (!token) {
        return {
            configuration: null,
            skippedReason: 'Cloudflare sync skipped because `CLOUDFLARE_API_TOKEN` is missing.',
        };
    }

    return {
        configuration: { token },
        skippedReason: null,
    };
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
            return resolveBranchBoundDesiredProjectDomain(
                normalizedDomain,
                server.environment,
                options.projectMetadata,
            );

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
 * Gets Vercel DNS recommendations for one domain.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Managed domain name.
 * @returns Vercel domain DNS recommendations.
 */
async function getVercelDomainConfiguration(
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
 * Syncs Cloudflare DNS records for the desired managed domains.
 *
 * Note: This intentionally never deletes Cloudflare records, because one zone can contain subdomains for unrelated projects.
 *
 * @param options - Cloudflare/Vercel sync options.
 * @returns Planned/applied Cloudflare DNS changes.
 */
async function syncCloudflareDnsRecords(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly vercelConfiguration: VercelApiConfiguration;
    readonly desiredDomains: ReadonlyArray<string>;
    readonly dryRun: boolean;
}): Promise<CloudflareDnsRecordSyncPlan> {
    const zones = await listCloudflareZones(options.cloudflareConfiguration);
    logSyncEvent('info', 'cloudflare_zones_loaded', {
        count: zones.length,
        dryRun: options.dryRun,
    });

    const desiredRecordsResolution = await resolveDesiredCloudflareDnsRecords({
        cloudflareConfiguration: options.cloudflareConfiguration,
        vercelConfiguration: options.vercelConfiguration,
        domains: options.desiredDomains,
        zones,
    });
    const cloudflareSyncPlan = await createCloudflareDnsRecordSyncPlan({
        cloudflareConfiguration: options.cloudflareConfiguration,
        desiredRecords: desiredRecordsResolution.desiredRecords,
        skippedDomains: desiredRecordsResolution.skippedDomains,
    });

    logSyncEvent('info', 'cloudflare_sync_planned', {
        createCount: cloudflareSyncPlan.recordsToCreate.length,
        updateCount: cloudflareSyncPlan.recordsToUpdate.length,
        skippedCount: cloudflareSyncPlan.skippedDomains.length,
        dryRun: options.dryRun,
    });

    for (const skippedDomain of cloudflareSyncPlan.skippedDomains) {
        logSyncEvent('warn', 'cloudflare_domain_skipped', {
            domain: skippedDomain.domain,
            reason: skippedDomain.reason,
            dryRun: options.dryRun,
        });
    }

    for (const recordToCreate of cloudflareSyncPlan.recordsToCreate) {
        if (options.dryRun) {
            logSyncEvent('info', 'cloudflare_record_create_planned', {
                domain: recordToCreate.name,
                zone: recordToCreate.zoneName,
                type: recordToCreate.type,
                content: recordToCreate.content,
                proxied: recordToCreate.proxied,
                ttl: recordToCreate.ttl,
                dryRun: true,
            });
            continue;
        }

        await createCloudflareDnsRecord(options.cloudflareConfiguration, recordToCreate);
        logSyncEvent('info', 'cloudflare_record_created', {
            domain: recordToCreate.name,
            zone: recordToCreate.zoneName,
            type: recordToCreate.type,
            content: recordToCreate.content,
            proxied: recordToCreate.proxied,
            ttl: recordToCreate.ttl,
            dryRun: false,
        });
    }

    for (const recordToUpdate of cloudflareSyncPlan.recordsToUpdate) {
        if (options.dryRun) {
            logSyncEvent('info', 'cloudflare_record_update_planned', {
                domain: recordToUpdate.desiredRecord.name,
                zone: recordToUpdate.desiredRecord.zoneName,
                type: recordToUpdate.desiredRecord.type,
                currentContent: recordToUpdate.currentRecord.content,
                desiredContent: recordToUpdate.desiredRecord.content,
                reasons: recordToUpdate.reasons,
                dryRun: true,
            });
            continue;
        }

        await updateCloudflareDnsRecord(options.cloudflareConfiguration, recordToUpdate);
        logSyncEvent('info', 'cloudflare_record_updated', {
            domain: recordToUpdate.desiredRecord.name,
            zone: recordToUpdate.desiredRecord.zoneName,
            type: recordToUpdate.desiredRecord.type,
            currentContent: recordToUpdate.currentRecord.content,
            desiredContent: recordToUpdate.desiredRecord.content,
            reasons: recordToUpdate.reasons,
            dryRun: false,
        });
    }

    return cloudflareSyncPlan;
}

/**
 * Lists all Cloudflare zones accessible by the configured API token.
 *
 * @param configuration - Cloudflare API configuration.
 * @returns Accessible Cloudflare zones.
 */
async function listCloudflareZones(configuration: CloudflareApiConfiguration): Promise<Array<CloudflareZone>> {
    const zones: Array<CloudflareZone> = [];
    let page = 1;
    let totalPages = 1;

    do {
        const searchParams = new URLSearchParams({
            page: String(page),
            per_page: String(CLOUDFLARE_ZONES_PAGE_LIMIT),
        });
        const response = await requestCloudflare<Array<CloudflareZone>>({
            configuration,
            method: 'GET',
            pathname: '/zones',
            searchParams,
        });

        zones.push(...response.result);
        totalPages = response.result_info?.total_pages || 1;
        page++;
    } while (page <= totalPages);

    return zones;
}

/**
 * Resolves desired Cloudflare DNS records from Vercel domain recommendations.
 *
 * @param options - Cloudflare/Vercel domain metadata.
 * @returns Desired records plus domains that were skipped before record diffing.
 */
async function resolveDesiredCloudflareDnsRecords(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly vercelConfiguration: VercelApiConfiguration;
    readonly domains: ReadonlyArray<string>;
    readonly zones: ReadonlyArray<CloudflareZone>;
}): Promise<{
    readonly desiredRecords: ReadonlyArray<DesiredCloudflareDnsRecord>;
    readonly skippedDomains: ReadonlyArray<CloudflareSkippedDomain>;
}> {
    const desiredRecords: Array<DesiredCloudflareDnsRecord> = [];
    const skippedDomains: Array<CloudflareSkippedDomain> = [];

    for (const domain of options.domains) {
        const zone = findBestMatchingCloudflareZoneForDomain(domain, options.zones);
        if (!zone) {
            skippedDomains.push({
                domain,
                reason: 'No matching Cloudflare zone was found for this managed domain.',
            });
            continue;
        }

        const domainConfiguration = await getVercelDomainConfiguration(options.vercelConfiguration, domain);
        desiredRecords.push(resolveDesiredCloudflareDnsRecord(domain, zone, domainConfiguration));
    }

    return {
        desiredRecords,
        skippedDomains,
    };
}

/**
 * Resolves the desired Cloudflare DNS record for one managed domain.
 *
 * @param domain - Managed domain.
 * @param zone - Matching Cloudflare zone.
 * @param domainConfiguration - Vercel DNS recommendations.
 * @returns Desired Cloudflare DNS record.
 */
export function resolveDesiredCloudflareDnsRecord(
    domain: string,
    zone: Pick<CloudflareZone, 'id' | 'name'>,
    domainConfiguration: VercelDomainConfiguration,
): DesiredCloudflareDnsRecord {
    const normalizedDomain = normalizeManagedDomain(domain);
    const normalizedZoneName = normalizeManagedDomain(zone.name);
    const preferredComment = createCloudflareManagedRecordComment(null);
    const preferredTags = shouldUseCloudflareAutomationTags() ? [CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG] : [];

    if (normalizedDomain === normalizedZoneName) {
        const preferredIpv4 = extractPreferredRecommendedIpv4(domainConfiguration.recommendedIPv4);
        if (!preferredIpv4) {
            throw new DatabaseError(
                spaceTrim(`
                    Failed to resolve a recommended IPv4 for apex domain \`${normalizedDomain}\` from Vercel.
                `),
            );
        }

        return {
            zoneId: zone.id,
            zoneName: normalizedZoneName,
            name: normalizedDomain,
            type: 'A',
            content: preferredIpv4,
            proxied: CLOUDFLARE_DNS_RECORD_PROXIED,
            ttl: CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
            comment: preferredComment,
            tags: preferredTags,
        };
    }

    const preferredCname = extractPreferredRecommendedCname(domainConfiguration.recommendedCNAME);
    if (!preferredCname) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to resolve a recommended CNAME for subdomain \`${normalizedDomain}\` from Vercel.
            `),
        );
    }

    return {
        zoneId: zone.id,
        zoneName: normalizedZoneName,
        name: normalizedDomain,
        type: 'CNAME',
        content: preferredCname,
        proxied: CLOUDFLARE_DNS_RECORD_PROXIED,
        ttl: CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
        comment: preferredComment,
        tags: preferredTags,
    };
}

/**
 * Creates a diff between desired Cloudflare DNS records and current records.
 *
 * @param options - Desired records and access to Cloudflare.
 * @returns Cloudflare DNS sync plan.
 */
export async function createCloudflareDnsRecordSyncPlan(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly desiredRecords: ReadonlyArray<DesiredCloudflareDnsRecord>;
    readonly skippedDomains?: ReadonlyArray<CloudflareSkippedDomain>;
}): Promise<CloudflareDnsRecordSyncPlan> {
    const recordsToCreate: Array<DesiredCloudflareDnsRecord> = [];
    const recordsToUpdate: Array<CloudflareDnsRecordUpdate> = [];
    const skippedDomains = [...(options.skippedDomains || [])];
    const zoneRecordsCache = new Map<string, ReadonlyArray<CloudflareDnsRecord>>();

    for (const desiredRecord of options.desiredRecords) {
        const existingZoneRecords =
            zoneRecordsCache.get(desiredRecord.zoneId) ||
            (await listAllCloudflareDnsRecords(options.cloudflareConfiguration, desiredRecord.zoneId));
        zoneRecordsCache.set(desiredRecord.zoneId, existingZoneRecords);

        const existingRecords = existingZoneRecords.filter(
            (existingRecord) => normalizeManagedDomain(existingRecord.name) === desiredRecord.name,
        );
        const selectedExistingRecord = selectCloudflareRecordForManagedDomain(existingRecords, desiredRecord);

        if (!selectedExistingRecord) {
            const conflictingRecords = existingRecords.filter(
                (existingRecord) => normalizeManagedDomain(existingRecord.name) === desiredRecord.name,
            );

            if (conflictingRecords.length > 0) {
                skippedDomains.push({
                    domain: desiredRecord.name,
                    reason: 'Cloudflare already contains conflicting or ambiguous records on this hostname, so no automatic create/update was attempted.',
                });
                continue;
            }

            recordsToCreate.push(desiredRecord);
            continue;
        }

        const updateReasons = describeCloudflareDnsRecordUpdateReasons(selectedExistingRecord, desiredRecord);
        if (updateReasons.length > 0) {
            recordsToUpdate.push({
                currentRecord: selectedExistingRecord,
                desiredRecord,
                reasons: updateReasons,
            });
        }
    }

    return {
        recordsToCreate,
        recordsToUpdate,
        skippedDomains,
    };
}

/**
 * Lists all Cloudflare DNS records for one zone.
 *
 * @param configuration - Cloudflare API configuration.
 * @param zoneId - Zone id containing the record.
 * @returns DNS records in the zone.
 */
async function listAllCloudflareDnsRecords(
    configuration: CloudflareApiConfiguration,
    zoneId: string,
): Promise<Array<CloudflareDnsRecord>> {
    const records: Array<CloudflareDnsRecord> = [];
    let page = 1;
    let totalPages = 1;

    do {
        const searchParams = new URLSearchParams({
            page: String(page),
            per_page: String(CLOUDFLARE_DNS_RECORDS_PAGE_LIMIT),
        });

        const response = await requestCloudflare<Array<CloudflareDnsRecord>>({
            configuration,
            method: 'GET',
            pathname: `/zones/${encodeURIComponent(zoneId)}/dns_records`,
            searchParams,
        });

        records.push(...response.result);
        totalPages = response.result_info?.total_pages || 1;
        page++;
    } while (page <= totalPages);

    return records;
}

/**
 * Creates one Cloudflare DNS record.
 *
 * @param configuration - Cloudflare API configuration.
 * @param desiredRecord - Desired DNS record.
 */
async function createCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    desiredRecord: DesiredCloudflareDnsRecord,
): Promise<void> {
    const body: Record<string, unknown> = {
        type: desiredRecord.type,
        name: desiredRecord.name,
        content: desiredRecord.content,
        proxied: desiredRecord.proxied,
        ttl: desiredRecord.ttl,
        comment: desiredRecord.comment,
    };
    if (desiredRecord.tags.length > 0) {
        body.tags = desiredRecord.tags;
    }

    await requestCloudflare({
        configuration,
        method: 'POST',
        pathname: `/zones/${encodeURIComponent(desiredRecord.zoneId)}/dns_records`,
        body,
    });
}

/**
 * Updates one Cloudflare DNS record while preserving existing non-automation comments/tags.
 *
 * @param configuration - Cloudflare API configuration.
 * @param update - Existing/desired record pair.
 */
async function updateCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    update: CloudflareDnsRecordUpdate,
): Promise<void> {
    const body: Record<string, unknown> = {
        type: update.desiredRecord.type,
        name: update.desiredRecord.name,
        content: update.desiredRecord.content,
        proxied: update.desiredRecord.proxied,
        ttl: update.desiredRecord.ttl,
        comment: createCloudflareManagedRecordComment(update.currentRecord.comment),
    };
    const mergedTags = mergeCloudflareDnsRecordTags(update.currentRecord.tags);
    if (mergedTags.length > 0) {
        body.tags = mergedTags;
    }

    await requestCloudflare({
        configuration,
        method: 'PATCH',
        pathname: `/zones/${encodeURIComponent(update.desiredRecord.zoneId)}/dns_records/${encodeURIComponent(
            update.currentRecord.id,
        )}`,
        body,
    });
}

/**
 * Executes one Cloudflare API request and parses the JSON response envelope.
 *
 * @param options - HTTP request options.
 * @returns Parsed Cloudflare response envelope.
 */
async function requestCloudflare<TResult = Record<string, unknown>>(options: {
    readonly configuration: CloudflareApiConfiguration;
    readonly method: 'GET' | 'POST' | 'PATCH';
    readonly pathname: string;
    readonly searchParams?: URLSearchParams;
    readonly body?: Record<string, unknown>;
}): Promise<CloudflareApiEnvelope<TResult>> {
    const normalizedPathname = options.pathname.startsWith('/') ? options.pathname.slice(1) : options.pathname;
    const url = new URL(normalizedPathname, `${CLOUDFLARE_API_BASE_URL}/`);
    const serializedSearchParams = options.searchParams?.toString() || '';
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
    const responseText = await response.text();

    if (!response.ok) {
        throw new DatabaseError(
            spaceTrim(`
                Cloudflare API request failed.

                Method: \`${options.method}\`
                URL: \`${url.toString()}\`
                Status: \`${response.status}\`
                Response: \`${responseText || '<empty>'}\`
            `),
        );
    }

    const parsedResponse = (
        responseText ? JSON.parse(responseText) : { success: true, result: {} }
    ) as CloudflareApiEnvelope<TResult>;
    if (!parsedResponse.success) {
        throw new DatabaseError(
            spaceTrim(`
                Cloudflare API request returned an unsuccessful envelope.

                Method: \`${options.method}\`
                URL: \`${url.toString()}\`
                Errors: \`${JSON.stringify(parsedResponse.errors || [])}\`
            `),
        );
    }

    return parsedResponse;
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
 * Prints a colorized human-readable summary for interactive terminal runs.
 *
 * @param options - Sync execution options.
 * @param projectMetadata - Loaded Vercel project metadata.
 * @param syncPlan - Computed sync plan.
 */
function printHumanReadableSyncReport(options: {
    readonly options: SyncVercelDomainsOptions;
    readonly projectMetadata: VercelProjectMetadata;
    readonly syncPlan: VercelDomainSyncPlan;
    readonly cloudflareSyncPlan: CloudflareDnsRecordSyncPlan | null;
    readonly cloudflareSyncSkippedReason: string | null;
}): void {
    if (!isHumanReadableSyncReportEnabled()) {
        return;
    }

    const {
        cloudflareSyncPlan,
        cloudflareSyncSkippedReason,
        options: syncOptions,
        projectMetadata,
        syncPlan,
    } = options;
    const summaryLabel = syncOptions.dryRun ? 'planned changes' : 'applied changes';
    const reportSections = createHumanReadableReportSections(syncPlan, syncOptions, {
        cloudflareSyncPlan,
        cloudflareSyncSkippedReason,
    });
    const totalChangedDomains =
        syncPlan.domainsToAdd.length +
        syncPlan.domainsToVerify.length +
        syncPlan.domainsToReconfigure.length +
        (syncOptions.deleteRemoved ? syncPlan.domainsToFlag.length : 0);

    console.log('');
    console.log(colors.cyan.bold('━━━━━━━━━━ Vercel domain sync report ━━━━━━━━━━'));
    console.log(
        [
            `${colors.bold('Mode:')} ${syncOptions.dryRun ? colors.yellow.bold('DRY RUN') : colors.green.bold('LIVE')}`,
            `${colors.bold('Summary:')} ${colors.white.bold(String(totalChangedDomains))} ${summaryLabel}`,
            `${colors.bold('Desired domains:')} ${colors.white(String(syncPlan.desiredDomains.length))}`,
        ].join(` ${colors.gray('•')} `),
    );
    console.log(
        [
            `${colors.bold('Production branch:')} ${formatHumanReadableNullableValue(
                projectMetadata.productionBranch,
            )}`,
            `${colors.bold('Custom environments:')} ${colors.white(String(projectMetadata.customEnvironments.length))}`,
            `${colors.bold('Delete removed:')} ${syncOptions.deleteRemoved ? colors.red('yes') : colors.gray('no')}`,
        ].join(` ${colors.gray('•')} `),
    );

    if (reportSections.length === 0) {
        console.log(colors.green('✓ No domain changes were necessary.'));
        if (syncPlan.ignoredDomains.length > 0) {
            console.log(colors.gray(`○ Ignored ${syncPlan.ignoredDomains.length} Vercel-managed domain(s).`));
        }
        console.log(colors.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        return;
    }

    for (const section of reportSections) {
        console.log('');
        console.log(`${section.bullet} ${section.label}`);
        if (section.description) {
            console.log(`  ${colors.gray(section.description)}`);
        }
        for (const line of section.lines) {
            console.log(`  ${colors.gray('•')} ${line}`);
        }
    }

    console.log('');
    console.log(colors.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

/**
 * Creates itemized human-readable report sections for one sync plan.
 *
 * @param syncPlan - Computed sync plan.
 * @param options - Sync execution options.
 * @returns Ordered report sections.
 */
function createHumanReadableReportSections(
    syncPlan: VercelDomainSyncPlan,
    options: SyncVercelDomainsOptions,
    cloudflareOptions: {
        readonly cloudflareSyncPlan: CloudflareDnsRecordSyncPlan | null;
        readonly cloudflareSyncSkippedReason: string | null;
    },
): Array<HumanReadableReportSection> {
    const sections: Array<HumanReadableReportSection> = [];

    if (syncPlan.domainsToAdd.length > 0) {
        sections.push({
            key: 'add',
            label: colors.green.bold(options.dryRun ? 'Domains to add' : 'Domains added'),
            bullet: colors.green(options.dryRun ? '+' : '✓'),
            lines: syncPlan.domainsToAdd.map((domain) =>
                formatDesiredDomainReportLine(domain, {
                    includeEnvironmentLabel: true,
                }),
            ),
        });
    }

    if (syncPlan.domainsToReconfigure.length > 0) {
        sections.push({
            key: 'reconfigure',
            label: colors.yellow.bold(options.dryRun ? 'Domains to reconfigure' : 'Domains reconfigured'),
            bullet: colors.yellow('↺'),
            lines: syncPlan.domainsToReconfigure.map((reconfiguration) =>
                formatDomainReconfigurationReportLine(reconfiguration),
            ),
        });
    }

    if (syncPlan.domainsToVerify.length > 0) {
        sections.push({
            key: 'verify',
            label: colors.blue.bold(options.dryRun ? 'Domains to verify' : 'Domains verified'),
            bullet: colors.blue('✓'),
            lines: syncPlan.domainsToVerify.map((domain) => colors.white.bold(domain)),
        });
    }

    if (syncPlan.domainsToFlag.length > 0) {
        sections.push({
            key: options.deleteRemoved ? 'delete' : 'flag',
            label: options.deleteRemoved
                ? colors.red.bold(options.dryRun ? 'Domains to delete' : 'Domains deleted')
                : colors.red.bold('Domains flagged for removal'),
            description: options.deleteRemoved
                ? undefined
                : 'These domains still exist on Vercel but are no longer present in `_Server`. Re-run with `--delete-removed` to remove them.',
            bullet: colors.red(options.deleteRemoved ? '-' : '!'),
            lines: syncPlan.domainsToFlag.map((domain) => colors.white.bold(domain)),
        });
    }

    if (syncPlan.ignoredDomains.length > 0) {
        sections.push({
            key: 'ignored',
            label: colors.gray.bold('Ignored Vercel-managed domains'),
            bullet: colors.gray('○'),
            lines: syncPlan.ignoredDomains.map((domain) => colors.gray(domain)),
        });
    }

    if (cloudflareOptions.cloudflareSyncPlan) {
        if (cloudflareOptions.cloudflareSyncPlan.recordsToCreate.length > 0) {
            sections.push({
                key: 'cloudflare-create',
                label: colors.blue.bold(options.dryRun ? 'Cloudflare records to create' : 'Cloudflare records created'),
                bullet: colors.blue(options.dryRun ? '+' : '✓'),
                description:
                    'Cloudflare changes are create/update only. Unrelated DNS records in the same zone are intentionally left untouched.',
                lines: cloudflareOptions.cloudflareSyncPlan.recordsToCreate.map((record) =>
                    formatCloudflareDesiredRecordReportLine(record),
                ),
            });
        }

        if (cloudflareOptions.cloudflareSyncPlan.recordsToUpdate.length > 0) {
            sections.push({
                key: 'cloudflare-update',
                label: colors.blue.bold(options.dryRun ? 'Cloudflare records to update' : 'Cloudflare records updated'),
                bullet: colors.blue('↺'),
                description: `Updated records are marked with comment ${CLOUDFLARE_DNS_RECORD_COMMENT_MARKER}.`,
                lines: cloudflareOptions.cloudflareSyncPlan.recordsToUpdate.map((update) =>
                    formatCloudflareRecordUpdateReportLine(update),
                ),
            });
        }

        if (cloudflareOptions.cloudflareSyncPlan.skippedDomains.length > 0) {
            sections.push({
                key: 'cloudflare-skip',
                label: colors.yellow.bold('Cloudflare domains skipped'),
                bullet: colors.yellow('!'),
                description:
                    'Skipped domains were not changed because the zone/record state looked unsafe or unsupported for automatic DNS updates.',
                lines: cloudflareOptions.cloudflareSyncPlan.skippedDomains.map(
                    (skippedDomain) =>
                        `${colors.white.bold(skippedDomain.domain)} ${colors.gray(`(${skippedDomain.reason})`)}`,
                ),
            });
        }
    } else if (cloudflareOptions.cloudflareSyncSkippedReason) {
        sections.push({
            key: 'cloudflare-disabled',
            label: colors.gray.bold('Cloudflare sync skipped'),
            bullet: colors.gray('○'),
            lines: [colors.gray(cloudflareOptions.cloudflareSyncSkippedReason)],
        });
    }

    return sections;
}

/**
 * Formats one desired Cloudflare DNS record for the human-readable report.
 *
 * @param record - Desired Cloudflare DNS record.
 * @returns Colorized report line.
 */
function formatCloudflareDesiredRecordReportLine(record: DesiredCloudflareDnsRecord): string {
    return [
        colors.white.bold(record.name),
        colors.gray(`(${record.zoneName})`),
        colors.cyan(record.type),
        colors.gray('→'),
        colors.white(record.content),
        colors.gray(
            `proxied=${record.proxied ? 'true' : 'false'}, ttl=${record.ttl === 1 ? 'auto' : String(record.ttl)}`,
        ),
    ].join(' ');
}

/**
 * Formats one Cloudflare DNS record update for the human-readable report.
 *
 * @param update - Existing/desired Cloudflare DNS record pair.
 * @returns Colorized report line.
 */
function formatCloudflareRecordUpdateReportLine(update: CloudflareDnsRecordUpdate): string {
    return [
        colors.white.bold(update.desiredRecord.name),
        colors.gray(`(${update.desiredRecord.zoneName})`),
        colors.cyan(update.desiredRecord.type),
        colors.gray(
            `${normalizeCloudflareDnsRecordContent(
                update.currentRecord.type,
                update.currentRecord.content,
            )} ${colors.yellow('→')} ${update.desiredRecord.content}`,
        ),
        colors.yellow(`[${update.reasons.join('; ')}]`),
    ].join(' ');
}

/**
 * Formats one desired domain binding for the human-readable report.
 *
 * @param domain - Desired domain binding.
 * @param options - Formatting options.
 * @returns Colorized report line.
 */
function formatDesiredDomainReportLine(
    domain: DesiredVercelProjectDomain,
    options: {
        readonly includeEnvironmentLabel: boolean;
    },
): string {
    const parts = [colors.white.bold(domain.name)];

    if (options.includeEnvironmentLabel) {
        parts.push(colors.gray(`← ${domain.sourceEnvironment}`));
    }

    parts.push(colors.cyan(domain.vercelEnvironmentName));

    const bindingDetails: Array<string> = [];
    if (domain.gitBranch) {
        bindingDetails.push(`branch ${colors.yellow(domain.gitBranch)}`);
    }
    if (domain.customEnvironmentId) {
        bindingDetails.push(`custom env ${colors.magenta(domain.customEnvironmentId)}`);
    }

    if (bindingDetails.length > 0) {
        parts.push(colors.gray(`(${bindingDetails.join(', ')})`));
    }

    return parts.join(' ');
}

/**
 * Formats one domain reconfiguration item for the human-readable report.
 *
 * @param reconfiguration - Domain reconfiguration details.
 * @returns Colorized report line.
 */
function formatDomainReconfigurationReportLine(reconfiguration: VercelDomainReconfiguration): string {
    const currentBinding = normalizeVercelDomainBinding(reconfiguration.currentDomain);
    const desiredBinding = normalizeVercelDomainBinding(reconfiguration.desiredDomain);

    return [
        colors.white.bold(reconfiguration.desiredDomain.name),
        colors.gray(
            `(${reconfiguration.desiredDomain.sourceEnvironment} → ${reconfiguration.desiredDomain.vercelEnvironmentName})`,
        ),
        colors.gray(
            `${formatHumanReadableBinding(currentBinding)} ${colors.yellow('→')} ${formatHumanReadableBinding(
                desiredBinding,
            )}`,
        ),
        colors.yellow(`[${reconfiguration.reasons.join('; ')}]`),
    ].join(' ');
}

/**
 * Formats one normalized domain binding for the human-readable report.
 *
 * @param binding - Normalized branch/custom-environment binding.
 * @returns Colorized binding label.
 */
function formatHumanReadableBinding(binding: {
    readonly gitBranch: string | null;
    readonly customEnvironmentId: string | null;
}): string {
    const bindingParts: Array<string> = [];

    if (binding.gitBranch !== null) {
        bindingParts.push(`branch ${colors.yellow(binding.gitBranch)}`);
    }

    if (binding.customEnvironmentId !== null) {
        bindingParts.push(`env ${colors.magenta(binding.customEnvironmentId)}`);
    }

    if (bindingParts.length === 0) {
        return colors.gray('<default>');
    }

    return bindingParts.join(', ');
}

/**
 * Formats one nullable summary value for the human-readable report.
 *
 * @param value - Raw summary value.
 * @returns Colorized value.
 */
function formatHumanReadableNullableValue(value: string | null | undefined): string {
    return value ? colors.white(value) : colors.gray('<none>');
}

/**
 * Detects whether the human-readable sync report should be printed.
 *
 * @returns `true` when interactive color output is expected.
 */
function isHumanReadableSyncReportEnabled(): boolean {
    if (process.env.PROMPTBOOK_SYNC_VERCEL_DOMAINS_HUMAN_REPORT === 'false') {
        return false;
    }

    return Boolean(process.stdout.isTTY || process.env.FORCE_COLOR);
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
 * Finds the best matching Cloudflare zone for one fully-qualified domain.
 *
 * @param domain - Fully-qualified managed domain.
 * @param zones - Accessible Cloudflare zones.
 * @returns Best matching zone or `null`.
 */
function findBestMatchingCloudflareZoneForDomain(
    domain: string,
    zones: ReadonlyArray<CloudflareZone>,
): CloudflareZone | null {
    const normalizedDomain = normalizeManagedDomain(domain);
    let bestMatch: CloudflareZone | null = null;

    for (const zone of zones) {
        const normalizedZoneName = normalizeManagedDomain(zone.name);
        if (normalizedDomain !== normalizedZoneName && !normalizedDomain.endsWith(`.${normalizedZoneName}`)) {
            continue;
        }

        if (!bestMatch || normalizedZoneName.length > normalizeManagedDomain(bestMatch.name).length) {
            bestMatch = zone;
        }
    }

    return bestMatch;
}

/**
 * Extracts the preferred Vercel-recommended IPv4 value.
 *
 * @param recommendedIpv4 - Ranked recommended IPv4 values.
 * @returns Preferred IPv4 or `null`.
 */
function extractPreferredRecommendedIpv4(
    recommendedIpv4: ReadonlyArray<{
        readonly rank: number;
        readonly value: ReadonlyArray<string>;
    }>,
): string | null {
    const preferredRecommendation = [...recommendedIpv4].sort((left, right) => left.rank - right.rank)[0];
    const preferredValue = preferredRecommendation?.value[0];
    return preferredValue ? preferredValue.trim() : null;
}

/**
 * Extracts the preferred Vercel-recommended CNAME target.
 *
 * @param recommendedCname - Ranked recommended CNAME targets.
 * @returns Preferred CNAME target or `null`.
 */
function extractPreferredRecommendedCname(
    recommendedCname: ReadonlyArray<{
        readonly rank: number;
        readonly value: string;
    }>,
): string | null {
    const preferredRecommendation = [...recommendedCname].sort((left, right) => left.rank - right.rank)[0];
    return preferredRecommendation ? normalizeCloudflareDnsRecordContent('CNAME', preferredRecommendation.value) : null;
}

/**
 * Picks the Cloudflare record that should represent the managed hostname.
 *
 * @param existingRecords - Current Cloudflare records for the exact name.
 * @param desiredRecord - Desired Cloudflare record.
 * @returns Selected record or `null` when the situation is ambiguous.
 */
function selectCloudflareRecordForManagedDomain(
    existingRecords: ReadonlyArray<CloudflareDnsRecord>,
    desiredRecord: DesiredCloudflareDnsRecord,
): CloudflareDnsRecord | null {
    const matchingTypeRecords = existingRecords.filter((existingRecord) => existingRecord.type === desiredRecord.type);
    if (matchingTypeRecords.length === 0) {
        return null;
    }

    const managedRecords = matchingTypeRecords.filter(isManagedCloudflareDnsRecord);
    if (managedRecords.length === 1) {
        return managedRecords[0] || null;
    }
    if (managedRecords.length > 1) {
        return null;
    }

    const exactContentMatches = matchingTypeRecords.filter(
        (existingRecord) =>
            normalizeCloudflareDnsRecordContent(existingRecord.type, existingRecord.content) === desiredRecord.content,
    );
    if (exactContentMatches.length === 1) {
        return exactContentMatches[0] || null;
    }
    if (matchingTypeRecords.length === 1) {
        return matchingTypeRecords[0] || null;
    }

    return null;
}

/**
 * Lists human-readable reasons why a Cloudflare DNS record should be updated.
 *
 * @param currentRecord - Existing Cloudflare DNS record.
 * @param desiredRecord - Desired Cloudflare DNS record.
 * @returns Update reasons.
 */
function describeCloudflareDnsRecordUpdateReasons(
    currentRecord: CloudflareDnsRecord,
    desiredRecord: DesiredCloudflareDnsRecord,
): Array<string> {
    const reasons: Array<string> = [];

    if (normalizeCloudflareDnsRecordContent(currentRecord.type, currentRecord.content) !== desiredRecord.content) {
        reasons.push(`content ${currentRecord.content} -> ${desiredRecord.content}`);
    }

    if (Boolean(currentRecord.proxied) !== desiredRecord.proxied) {
        reasons.push(
            `proxied ${currentRecord.proxied ? 'true' : 'false'} -> ${desiredRecord.proxied ? 'true' : 'false'}`,
        );
    }

    if ((currentRecord.ttl || CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC) !== desiredRecord.ttl) {
        reasons.push(
            `ttl ${String(currentRecord.ttl || CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC)} -> ${String(desiredRecord.ttl)}`,
        );
    }

    if (!hasCloudflareManagedRecordComment(currentRecord.comment)) {
        reasons.push('comment marker missing');
    }

    if (shouldUseCloudflareAutomationTags() && !hasCloudflareAutomationTag(currentRecord.tags)) {
        reasons.push('automation tag missing');
    }

    return reasons;
}

/**
 * Checks whether the Cloudflare DNS record already carries the automation marker.
 *
 * @param record - Cloudflare DNS record.
 * @returns `true` when the record looks auto-managed by this script.
 */
function isManagedCloudflareDnsRecord(record: CloudflareDnsRecord): boolean {
    return hasCloudflareManagedRecordComment(record.comment) || hasCloudflareAutomationTag(record.tags);
}

/**
 * Checks whether the Cloudflare record comment already contains the automation marker.
 *
 * @param comment - Optional Cloudflare record comment.
 * @returns `true` when the marker is present.
 */
function hasCloudflareManagedRecordComment(comment: string | null | undefined): boolean {
    return typeof comment === 'string' && comment.includes(CLOUDFLARE_DNS_RECORD_COMMENT_MARKER);
}

/**
 * Checks whether the Cloudflare record tags already contain the automation tag.
 *
 * @param tags - Optional Cloudflare record tags.
 * @returns `true` when the automation tag is present.
 */
function hasCloudflareAutomationTag(tags: ReadonlyArray<string> | null | undefined): boolean {
    return Boolean((tags || []).some((tag) => tag === CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG));
}

/**
 * Creates a visible Cloudflare record comment that preserves any pre-existing comment text.
 *
 * @param existingComment - Existing Cloudflare record comment.
 * @returns Updated comment string.
 */
function createCloudflareManagedRecordComment(existingComment: string | null | undefined): string {
    const normalizedExistingComment = typeof existingComment === 'string' ? existingComment.trim() : '';
    if (!normalizedExistingComment) {
        return CLOUDFLARE_DNS_RECORD_COMMENT_MARKER;
    }
    if (normalizedExistingComment.includes(CLOUDFLARE_DNS_RECORD_COMMENT_MARKER)) {
        return normalizedExistingComment;
    }

    return `${normalizedExistingComment} | ${CLOUDFLARE_DNS_RECORD_COMMENT_MARKER}`;
}

/**
 * Merges existing Cloudflare tags with the stable automation tag.
 *
 * @param tags - Existing Cloudflare record tags.
 * @returns Updated unique tag list.
 */
function mergeCloudflareDnsRecordTags(tags: ReadonlyArray<string> | null | undefined): Array<string> {
    if (!shouldUseCloudflareAutomationTags()) {
        return [...(tags || [])];
    }

    const mergedTags = [...(tags || [])];
    if (!mergedTags.includes(CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG)) {
        mergedTags.push(CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG);
    }
    return mergedTags;
}

/**
 * Determines whether Cloudflare automation tags should be used in addition to comments.
 *
 * Some zones/accounts have zero tag quota, so comments are the safe default marker.
 *
 * @returns `true` when tags are explicitly enabled.
 */
function shouldUseCloudflareAutomationTags(): boolean {
    return process.env.PROMPTBOOK_SYNC_CLOUDFLARE_USE_TAGS === 'true';
}

/**
 * Normalizes Cloudflare DNS content for comparison and payload generation.
 *
 * @param type - DNS record type.
 * @param content - Raw record content.
 * @returns Normalized content.
 */
function normalizeCloudflareDnsRecordContent(type: string, content: string): string {
    const normalizedContent = content.trim();
    if (type === 'CNAME') {
        return normalizedContent.replace(/\.$/, '').toLowerCase();
    }
    return normalizedContent;
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
 * Normalizes the branch/custom-environment binding for one Vercel domain-like payload.
 *
 * @param domain - Existing or desired domain payload.
 * @returns Normalized branch/custom-environment binding.
 */
function normalizeVercelDomainBinding(domain: {
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

if (process.env.PROMPTBOOK_RUN_SYNC_VERCEL_DOMAINS_MAIN !== 'false') {
    main().catch((error) => {
        logSyncEvent('error', 'sync_failed', {
            message: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    });
}
